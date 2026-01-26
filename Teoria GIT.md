1. Inizializzare un repository locale:
git init

2. Configurare l'utente git:
git config --global user.name "First-name Surname"
git config --global user.email "you@email.com"

3. Collegare il repository locale al repository remoto:
git remote add origin https://github.com/fraPeloz/GO-ON.git
Aggiunge un "remote" (collegamento URL) chiamato origin al tuo repository locale

TEORIA
Git tiene traccia dei file e della storia del progetto tramite 3 aree alberi:
- Working: dove modifichi fisicamente i file sul PC
- Staging: zona temporanea per preparare cosa includere nel prossimo commit
- History: storia salvata e permanente dei cambiamenti

In base alle azioni eseguite, ogni file può trovarsi in uno di questi stati:
- Untracked: file nuovi che Git non sta ancora monitorando (non fanno parte del repository)
- Modified: file tracciati che sono stati cambiati ma non sono ancora nello staging
- Staged: file preparati per il commit tramite git add
- Committed: file salvati in modo permanente nello storico con git commit

Esempio:
- Crei un nuovo file "README.md" (untracked)
- Fai "git add README.md" (staged)
- Fai "git commit -m "Descrizione del Commit" " (committed localmente)
- Fai "git push origin main" (committed nel remoto, in particolare nel branch origin/main)
Ora se modifichi il file lo stato diventa modified.

4. Stato del progetto: presenta il branch attuale e lo stato dei vari file.
git status

5. Vedere la storia dei commit:
git log --oneline --graph --decorate --all
git log --stat
git log --patch

BRANCH
In git un branch è un puntatore ad un commit. Il branch di default è il main.
Esiste un puntatore HEAD che punta al branch che stai utilizzando.

Esempio:
Commit_1 -> Commit_2 -> Commit_3
- Il main punta all'ultimo commit:
  Main -> Commit_3        
- L'HEAD punta al Main
  HEAD -> Main

6. Navigare nei branch o nella storia dei commit
git switch "nome-branch"
git switch "hash-di-commit"

Scorciatoie: main^ o main~1 -> il commit prima della punta del main
git switch HEAD^: tornare al commit precedente dall'attuale posizione

Usando switch ci sono due possibili casi:
- HEAD punta a un branch
  Esempio: HEAD → main → C5
  Se fai commit, main si aggiorna e HEAD lo segue.

- HEAD punta direttamente a un commit
  git switch HEAD^
  Esempio: HEAD → C4 (main è fermo su C5)
  Siamo in detached HEAD state, quindi non sei in un branch e se si eseguono commit bisogna creare un branch

Visuale semplice
Caso 1:
C1 → C2 → C3 → C4 → C5
                    ↑
                  main
                  HEAD

Caso 2: 
C1 → C2 → C3 → C4 → C5
               ↑
             HEAD     
main → C5

Per ignorare un file si usa il file .gitignore in cui si scrivono i nomi dei file di cui non si vuole tenere traccia.

7. Creare/Eliminare un branch (localmente)
git branch "nome_branch"
git branch -d "nome_branch"

Nel repository remoto:
git push origin -d "nome_branch"

8. Merge di un branch
git merge "nome_branch"
Esempio:
- master
    Teoria GIT.md (versione 1)
- prova
    Teoria GIT.md (versione 2)
    ProvaFile.txt
Branch Attuale: master
Faccio il comando: git merge prova
Nel master ci saranno:
    Teoria GIT.md (Versione 2)
    ProvaFile.txt
Attenzione: non sempre è possibile fare merge (Three-way merge)

9. Clonare un repository
git clone https://github.com/user/repo

Conflitti tra Branch
Quando fai un merge tra due branch, Git prova automaticamente a unire le modifiche dei file.
Ma se due branch hanno modificato la stessa riga dello stesso file, Git non sa quale versione scegliere → quindi nasce un conflitto (merge conflict).
Esempio: 
<<<<<<< HEAD
prova2
=======
prova1
>>>>>>> nome_branch
Scegliere quale opzione accettare.
Attenzione, siamo ora nel branch master|MERGING, bisogna quindi fare:
- git add
- git commit

Rewriting History and Undoing Commits
10. git rebase "nome_branch" 
Prendi i commit del branch corrente e applicali di nuovo sopra l'ultimo commit del branch "nome_branch".

Esempio: 
master: A ─ B ─ C
feature:        \ ─ D ─ E
Fai il comando (nel branch feature): git rebase master
master:   A ─ B ─ C ─ D ─ E
                      ↑  commits del branch feature applicati sopra

11. git reset HEAD~2
Riscrive la storia recente spostando il puntatore del branch indietro nel tempo.
Non cancella fisicamente i commit, ma semplicemente fa finta che non fossero mai esistiti (fino a quando non vengono recuperati).

Opzioni:
- --soft
git reset --soft HEAD~2: sposta il branch indietro ma non tocca staging e working directory. Tutti i commit rimossi diventano staged.
- --mixed (default)
git reset --mixed HEAD~2: sposta il branch indietro e svuota lo staging area, ma i file rimangono modificati nella working directory.
- --hard
git reset --hard HEAD~2: sposta il branch indietro, cancella lo staging e ripristina la working directory come se i commit non fossero mai esistiti.

Quindi:
git reset --soft	-> Togli commit ma mantieni tutto nello staging
git reset --mixed	-> Togli commit e togli dallo staging, file ancora modificati
git reset --hard	-> Elimina commit e modifica file, torna indietro completamente

12. git revert "hash-del-commit"
Git revert è un comando di undo sicuro, cioè serve per annullare gli effetti di un commit senza cancellarlo dalla storia.
A differenza di git reset, che riscrive la storia, git revert crea un nuovo commit che "inverte" le modifiche apportate da un commit precedente.

Esempio:
git init
git add demo_file
git commit -am "initial commit"

echo "initial content" >> demo_file
git commit -am "add new content to demo file"

echo "prepended line content" >> demo_file
git commit -am "prepend content to demo file"

Tre commit nello storico:
86bb32e prepend content to demo file
3602d88 add new content to demo file
299b15f initial commit

Fai "git revert HEAD"

Ora nello storico avrai:
1061e79 Revert "prepend content to demo file"
86bb32e prepend content to demo file
3602d88 add new content to demo file
299b15f initial commit

Il commit 86bb32e è ancora nella storia (non è stato cancellato!), ma il commit 1061e79 annulla le modifiche di 86bb32e
Da non usare se si deve cancellare commit locali mai condivisi.

Stashing changes
"git stash" serve per mettere da parte temporaneamente modifiche non ancora committate.
Si usa quando si sta lavorando su un file ma si deve cambiare branch per fare una modifica urgente.
Comandi:
- git stash       	    Nasconde le modifiche e pulisce la working directory
- git stash list	      Mostra gli stash salvati
- git stash pop	        Recupera l'ultimo stash e lo rimuove
- git stash apply	      Applica uno stash ma lo mantiene salvato

Tagging
I tag servono per dare un nome leggibile a un commit specifico della storia, tipicamente per versioni di release.
Tipologie:
- Lightweight: semplice riferimento a un commit (tag privato)
- Annotated: contiene metadata, come autore, messaggi, data, ...	(tag pubblico ufficiale)

Comandi:
- Creare un lightweight tag:
git tag v1.0 
- Creare un annotated tag:
git tag -a v1.0 -m "my version 1.0"
- Elenco dei tag:
git tag
- Inviare un tag alla repository remota:
git push origin v1.0

Patching
Un patch è un file che contiene le differenze tra due versioni di un repository.
Usato per condividere piccole correzioni senza inviare tutto il progetto.

Comandi:
- Creare un patch file
git diff > my_patch_file.patch
- Applicare un patch
git apply my_patch_file.patch

COMANDI IMPORTANTI PER FARE MERGE DI UN BRANCH
git checkout main
git pull origin main
git checkout -b "nome_branch"

Branch di base:
- Backend 
- Frontend

branch_base/feat/nome_feat: nuova funzionalità
branch_base/fix/nome_fix: sistemare il codice/bug