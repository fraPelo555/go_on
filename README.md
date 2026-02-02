Progetto/
├─ .github/
│  └─ workflows/
│     ├─ backend.yml
│     └─ frontend.yml
├─ backend/
│  ├─ package.json
│  ├─ package-lock.json
│  └─ src/
│     ├─ middlewares/
│     │  ├─ requireRole.js
│     │  ├─ selfOrAdmin.js
│     │  └─ TokenChecker.js
│     ├─ models/
│     │  ├─ Feedback.js
│     │  ├─ Report.js
│     │  ├─ Trail.js
│     │  └─ User.js
│     ├─ routes/
│     │  ├─ Feedback.js
│     │  ├─ Report.js
│     │  ├─ Trail.js
│     │  └─ User.js
│     ├─ uploads/
│     ├─ app.js
│     └─ db.js
├─ frontend/
│  ├─ package.json
│  ├─ package-lock.json
│  └─ src/...
├─ .gitignore
├─ README.md

Attenzione: 
- Cartella .github/workflows viene creata automaticamente nel deployment.

Per scaricare il progetto:
1. git config --global credential.helper manager
2. gh auth login
3. git clone "https://github.com/fraPelo555/go_on.git"
4. git checkout -b backend origin/backend
5. git checkout -b frontend origin/frontend


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////                                                 ////////////////////////////////
////////////////////////////////                     BACKEND                     ////////////////////////////////
////////////////////////////////                                                 ////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Per avviare il progetto:
1. npm install 
2. creare file ".env" con le password
3. npm run dev

DA FARE BACKEND:
- ricollegare apiary e postman sul github nuovo
- authentication Google (e anche senza)
- mettere i permessi alle API
- nella descrizione di Apiary il prof. descrive che il JWT può essere inserito tramite Header (x-access-token) e Query String. L'approccio moderno è utilizzare Bearer-token.

API:
- Trails
    GET                     "/trails"       	                            Lista trail con filtri (region, valley, difficulty, tags, length, duration, ecc.)
    POST                    "/trails"	                                    Creare un nuovo trail [Autenticazione+Admin]
    GET	                    "/trails/{id}"	                                Ottenere un trail tramite ID
    PUT                     "/trails/{id}"      	                        Aggiornare un trail [Autenticazione+Admin]
    DELETE	                "/trails/{id}"	                                Eliminare un trail [Autenticazione+Admin]
    GET	                    "/trails/near"	                                Trovare tutti i trail entro un raggio da un punto geografico scelto [Autenticazione]
    GET	                    "/trails/{id}/upload/gpx"	                    Fare il download file GPX di un trail

- Reports       
    POST	                "/reports"	                                    Crea un nuovo report [Autenticazione]
    GET	                    "/reports/all"	                                Ottiene tutti i report [Autenticazione+Admin]
    GET	                    "/reports/{id}"	                                Ottiene un report tramite ID [Autenticazione]
    DELETE	                "/reports/{id}"	                                Elimina un report [AutenticazioneSelf,Autenticazione+Admin]
    GET	                    "/reports/all/trail/{idTrail}"                  Report associati a un trail [Autenticazione]
    GET	                    "/reports/all/user/{idUser}"                    Report creati da un utente [AutenticazioneSelf,Autenticazione+Admin]

- Feedbacks     
    POST	                "/feedbacks/{idTrail}"                          Creare un feedback (1 per utente/trail) [AutenticazioneSelf]
    GET	                    "/feedbacks/all"                                Ottenere la lista di tutti feedback [Autenticazione+Admin]
    GET	                    "/feedbacks/{id}"	                            Ottenere un feedback tramite ID [Autenticazione]
    PUT                     "/feedbacks/{id}"	                            Aggiornare un feedback [AutenticazioneSelf,Autenticazione+Admin]
    DELETE	                "/feedbacks/{id}"	                            Eliminare un feedback [AutenticazioneSelf,Autenticazione+Admin]
    GET 	                "/feedbacks/all/trail/{idTrail}"	            Ottenere tutti i feedback di una trail specifica [Autenticazione]
    GET                     "/feedbacks/all/user/{idUser}"	                Ottenere tutti i feedback di un certo utente [AutenticazioneSelf,Autenticazione+Admin]

- Users
    POST	                "/users"	                                    Crea un nuovo utente e restituisce un JWT
    GET 	                "/users/all"                                    Lista di tutti gli utenti [Autenticazione+Admin]
    GET	                    "/users/{id}"	                                Ottenere un utente [AutenticazioneSelf,Autenticazione+Admin]
    PUT	                    "/users/{id}"	                                Aggiornare un utente [AutenticazioneSelf,Autenticazione+Admin]
    DELETE                  "/users/{id}"	                                Eliminare un utente [AutenticazioneSelf,Autenticazione+Admin]
    POST                    "/users/{idUser}/favourites/{idTrail}"          Aggiungere un trail ai preferiti di un certo utente [AutenticazioneSelf,Autenticazione+Admin]
    DELETE                  "/users/{idUser}/favourites/{idTrail}"	        Rimuovere un trail dai preferiti di un certo utente [AutenticazioneSelf,Autenticazione+Admin]
    GET 	                "/users/favourites/{idUser}"	                Ottenere la lista dei trail preferiti di un utente [AutenticazioneSelf,Autenticazione+Admin]


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////                                                 ////////////////////////////////
////////////////////////////////                     Frontend                    ////////////////////////////////
////////////////////////////////                                                 ////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Per avviare il progetto: 
1. npm install
2. npm run dev

DA FARE FRONTEND:
- Pagina Home
- Pagina Login
- Pagina Admin
- Creare cheda descrittiva per un trail