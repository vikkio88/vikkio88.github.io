(function () {
    'use strict';

    var initialNote = {
        key: 1,
        label: 'Note One',
        body: 'Body text Body body',
        time: 1453489481
    };

    var notesUpdatedEvent = new Event("updatednotes");

    var app = {
        hasRequestPending: false,
        isLoading: true,
        visibleCards: {},
        cachedNotes: [],
        spinner: document.querySelector('.loader'),
        cardTemplate: document.querySelector('.cardTemplate'),
        container: document.querySelector('.main'),
        addDialog: document.querySelector('#addDialog'),
        loginDialog: document.querySelector('#login-dialog'),
        headerBar: document.querySelector('.header'),
        mainBody: document.querySelector('.cardTemplate'),
        status: document.querySelector('#status')
    };


    /*****************************************************************************
     *
     * Event listeners for UI elements
     *
     ****************************************************************************/
    window.onload = function () {
        app.checkLogin();
    };

    window.addEventListener('online', function () {
        app.updateOnlineStatus()
    });
    window.addEventListener('offline', function () {
        app.updateOnlineStatus()
    });

    document.addEventListener('updatednotes', function () {
        console.log("updated notes event");
        app.renderCachedNotes();
    });

    document.getElementById('login-button').addEventListener('click', function () {
        app.login();
    });

    document.getElementById('butLogout').addEventListener('click', function () {
        app.logout();
    });

    document.getElementById('butAdd').addEventListener('click', function () {
        // Open/show the add new city dialog
        app.toggleAddDialog(true);
    });

    document.getElementById('butAddNote').addEventListener('click', function () {
        var noteTitle = document.getElementById('noteTitle').value;
        document.getElementById('noteTitle').value = '';
        var noteBody = document.getElementById('noteBody').value;
        document.getElementById('noteBody').value = '';
        var key = app.cachedNotes.length + 1;
        var newNote = {key: key, label: noteTitle, time: Date.now(), body: noteBody};
        app.cachedNotes.push(newNote);
        //* This will trigger the service remotely
        app.getNotes(key, noteTitle);
        //*/
        //Instead of doing the XHR bypass and call the render
        //app.updateNotes(newNote);
        //
        app.saveLocalNotes();
        app.toggleAddDialog(false);
    });

    document.getElementById('butAddCancel').addEventListener('click', function () {
        // Close the add new city dialog
        app.toggleAddDialog(false);
    });


    /*****************************************************************************
     *
     * Methods to update/refresh the UI
     *
     ****************************************************************************/

    app.checkLogin = function () {
        var user = window.localStorage.getItem('user');
        if (user === null) {
            app.headerBar.classList.add('invisible');
            app.mainBody.classList.add('invisible');
            app.loginDialog.classList.add('dialog-container--visible')
        } else {
            app.startUp();
        }

    };

    app.login = function () {
        window.localStorage.setItem('user', Math.random());
        app.headerBar.classList.remove('invisible');
        app.mainBody.classList.remove('invisible');
        app.loginDialog.classList.remove('dialog-container--visible');
        app.startUp();
    };

    app.logout = function () {
        window.localStorage.removeItem('user');
        var url = window.location.href;
        if (url.substr(-1) != '/') {
            url = url + '/';
        }
        window.location.href = url;
    };

    app.updateOnlineStatus = function () {
        var condition = navigator.onLine ? "online" : "offline";
        app.status.classList.remove('hidden');
        app.status.className = condition;
        app.status.innerHTML = condition.toUpperCase();
        window.setTimeout(function () {
                app.status.classList.add('hidden');
            },
            3000
        );
    };

    app.getRemoveButton = function (key) {
        var remove = document.createElement("button");
        remove.id = "remove-" + key;
        remove.classList.add("headerButton");
        remove.classList.add("butDeleteIcon");
        remove.innerHTML = "Remove";
        remove.addEventListener('click', function () {
            var id = this.id.replace('remove-', '');
            app.removeNote(id);
            var noteCard = document.getElementById('note-' + key);
            noteCard.parentNode.removeChild(noteCard);
        });
        return remove;
    };

    app.removeNote = function (key) {
        key = parseInt(key);
        var notes = app.cachedNotes.filter(function (el) {
            return el.key !== key;
        });
        app.cachedNotes = notes;
        app.saveLocalNotes();
    };

    // Toggles the visibility of the add new city dialog.
    app.toggleAddDialog = function (visible) {
        if (visible) {
            app.addDialog.classList.add('dialog-container--visible');
        } else {
            app.addDialog.classList.remove('dialog-container--visible');
        }
    };

    // Updates a weather card with the latest weather forecast. If the card
    // doesn't already exist, it's cloned from the template.
    app.updateNotes = function (data) {
        var card = app.visibleCards[data.key];
        if (!card) {
            card = app.cardTemplate.cloneNode(true);
            card.id = 'note-' + data.key;
            card.classList.remove('cardTemplate');
            card.querySelector('.location').textContent = data.label;
            card.removeAttribute('hidden');
            app.container.appendChild(card);
            app.visibleCards[data.key] = card;
            card.querySelector('.date').textContent = new Date(data.time * 1000);
            card.querySelector('.visual').textContent = data.body;
            var removeButton = app.getRemoveButton(data.key);
            card.appendChild(removeButton);

        }
        if (app.isLoading) {
            app.spinner.setAttribute('hidden', true);
            app.container.removeAttribute('hidden');
            app.isLoading = false;
        }
    };

    app.renderCachedNotes = function () {
        app.cachedNotes.forEach(function (note) {
            app.updateNotes(note);
        });
    };
    /*****************************************************************************
     *
     * Methods for dealing with the model
     *
     ****************************************************************************/

    // Gets a forecast for a specific city and update the card with the data
    app.getNotes = function (key, label) {
        if (!navigator.onLine) {
            app.renderCachedNotes();
            return;
        }

        var url = 'https://publicdata-weather.firebaseio.com/';
        url += key + '.json';
        if ('caches' in window) {
            caches.match(url).then(function (response) {
                if (response) {
                    response.json().then(function (json) {
                        // Only update if the XHR is still pending, otherwise the XHR
                        // has already returned and provided the latest data.
                        if (app.hasRequestPending) {
                            console.log('updated from cache');
                            json.key = key;
                            json.label = label;
                            app.updateNotes(json);
                        }
                    });
                }
            });
        }
        // Make the XHR to get the data, then update the card
        app.hasRequestPending = true;
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    var response = JSON.parse(request.response);
                    if (response != null) {
                        response.key = key;
                        response.label = label;
                        app.hasRequestPending = false;
                        app.updateNotes(response);
                    } else {
                        app.renderCachedNotes()
                    }
                }
            }
        };
        request.open('GET', url);
        request.send();
    };

    // Iterate all of the cards and attempt to get the latest forecast data
    app.updateNotesContent = function () {
        var keys = Object.keys(app.visibleCards);
        keys.forEach(function (key) {
            app.getNotes(key);
        });
    };

    // Save list of cities to localStorage, see note below about localStorage.
    app.saveLocalNotes = function () {
        var cachedNotes = JSON.stringify(app.cachedNotes);
        // IMPORTANT: See notes about use of localStorage.
        localStorage.cachedNotes = cachedNotes;
        document.dispatchEvent(notesUpdatedEvent);
    };

    /************************************************************************
     *
     * Code required to start the app
     *
     * NOTE: To simplify this codelab, we've used localStorage.
     *   localStorage is a synchronous API and has serious performance
     *   implications. It should not be used in production applications!
     *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
     *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
     ************************************************************************/

    app.startUp = function () {
        app.cachedNotes = localStorage.cachedNotes;
        if (app.cachedNotes) {
            app.cachedNotes = JSON.parse(app.cachedNotes);
            app.cachedNotes.forEach(function (city) {
                app.getNotes(city.key, city.label);
            });
        } else {
            app.updateNotes(initialNote);
            app.cachedNotes = [
                initialNote
            ];
            app.saveLocalNotes();
        }
    };

    var registration;

    if ('serviceWorker' in navigator) {
        console.log('Service Worker is supported');

        navigator.serviceWorker
            .register('service-worker.js')
            .then(function () {
                console.log('Service Worker Registered');
            });

        navigator.serviceWorker.register('service-worker-push-notifications.js').then(function () {
            return navigator.serviceWorker.ready;
        }).then(function (serviceWorkerRegistration) {
            registration = serviceWorkerRegistration;
            console.log('Service Worker is ready :)', registration);
        }).catch(function (error) {
            console.log('Service Worker Error :(', error);
        });
    }

    var subscription;
    var isSubscribed = false;
    var notificationsButton = document.getElementById('butNotifications');

    notificationsButton.addEventListener('click', function () {
        if (isSubscribed) {
            unsubscribe();
        } else {
            subscribe();
        }
    });

    function subscribe() {
        document.getElementById('butNotifications').classList.remove('butNotificationsIcon');
        document.getElementById('butNotifications').classList.add('butCrossIcon');
        registration.pushManager.subscribe({
            userVisibleOnly: true
        }).then(function (pushSubscription) {
            subscription = pushSubscription;
            console.log('Subscribed! Endpoint:', subscription.endpoint);
            isSubscribed = true;
        });
    }

    function unsubscribe() {
        document.getElementById('butNotifications').classList.remove('butCrossIcon');
        document.getElementById('butNotifications').classList.add('butNotificationsIcon');
        subscription.unsubscribe().then(function (event) {
            console.log('Unsubscribed!', event);
            isSubscribed = false;
        }).catch(function (error) {
            console.log('Error unsubscribing', error);
        });
    }

})();
