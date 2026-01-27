Progetto/
├─ .github/
│  └─ workflows/
│     ├─ backend.yml
│     └─ frontend.yml
├─ backend/
│  ├─ package.json
│  ├─ package-lock.json (o pnpm-lock.yaml)
│  └─ src/...
├─ frontend/
│  ├─ package.json
│  ├─ package-lock.json
│  └─ src/...
├─ .gitignore
├─ README.md

Per scaricare i branch da remoto:
git checkout -b backend origin/backend

/////////////////////////
//////// BACKEND ////////
/////////////////////////

Nel caso non si riesca a clonare il progetto:
1. git config --global credential.helper manager
2. git clone https://github.com/Marco-Brunori/GO-ON.git

Per avviare il progetto:
1. npm install 
2. creare file ".env" con all'interno l'utente
3. npm run dev

DA FARE BACKEND:
- Ricollegare apiary e postman sul github nuovo
- authentication Google (e anche senza)
- mettere i permessi alle API
- fare github workflow

//////////////////////////
//////// FRONTEND ////////
//////////////////////////

Per avviare il progetto: 
1. npm install
2. npm run dev

DA FARE FRONTEND:
- scheda descrittiva