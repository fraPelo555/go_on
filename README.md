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

Per avviare i test:
- npm run test 
- npm run test -- tests/"NomeFile".test.js

DA FARE BACKEND:
- ricollegare apiary e postman sul github nuovo
- nella descrizione di Apiary il prof. descrive che il JWT può essere inserito tramite Header (x-access-token) e Query String. L'approccio moderno è utilizzare Bearer-token.

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////                                                 ////////////////////////////////
////////////////////////////////                     Frontend                    ////////////////////////////////
////////////////////////////////                                                 ////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Per avviare il progetto: 
1. npm install
2. npm run dev