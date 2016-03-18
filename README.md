# Cararia_Project
Descrizione:
	Quest'applicazione permette di condividere con gli altri informazioni su un viaggio 
	che si è in programma di fare attraverso un messaggio twitter.
	
Come funziona:
	Quando si accede all'homepage dell'applicazione si hanno davanti due pulsanti:
	il primo ci permette di usufruire del servizio vero e proprio, cliccandoci sopra verremo
	portarti alla pagina di autenticazione di twitter;
	il secondo bottone ci consente di sapere quanti utenti hanno acceduto alla homepage 
	dell'applicazione.
	Proseguendo, dopo esserci autenticati con l'account di twitter verremo reindirizzati 
	in una pagina in cui è presente una form.
	A questo punto si dovrà compilare la form con le informazioni sul viaggio; in particolare 
	si dovrà inserire la stazione di partenza, la stazione di arrivo, l'ora e la data di partenza.
	A completamento della form il messaggio verrà generato automaticamente ed inviato solo 15 minuti
	prima dell'effettiva partenza.
	
Servizi REST usati:
	Per questa applicazione sono stati utilizzati due servizi REST:
	- API Twitter
	- API viaggio treno
	
	Per quanto riguarda twitter è stata implementata l'autenticazione e autorizzazione oauth; per
	eventuali informazioni riferirsi al seguente link: https://dev.twitter.com/oauth/3-legged .
	Inoltre, per poter inviare il tweet con le informazioni relative ad un viaggio è stata utilizzata
	la chiamata POST statues/update.

	Con le seconde API si prelevano informazioni relative ad una precisa stazione attraverso una GET.
	Per ulteriori informazioni riferirsi al seguente link: ...

Servizio di messaggeria asincrona:
	Rabbitmq è il servizio scelto. E' stato implementato nel seguente modo: si utilizza una singola coda
	di messaggi denominata 'hello' in cui viene inviato un messaggio ogni qual volta un utente accede 
	all'homepage dell'applicazione. Ogni volta che un utente clicca sul secondo bottone presente sulla homepage,
	viene attivato il server di rabbitmq che legge i messaggi presenti sulla coda ed incrementa di 1 il valore di un contatore;
	dopo aver letto tutti i messaggi si visualizza il numero di visitatori che hanno usufruito del servizio e si chiude il server.
