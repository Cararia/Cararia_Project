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
	si dovrà cercare per poi scegliere la stazione di partenza e di arrivo, e inserire l'ora e la data di partenza.
	A completamento della form il messaggio verrà generato automaticamente ed inviato solo 15 minuti
	prima dell'effettiva partenza.
	
Servizi REST usati:
	Per questa applicazione sono stati utilizzati due servizi REST:
	- API Twitter
	- API Viaggiatreno di Trenitalia
	
Per quanto riguarda twitter è stata implementata l'autenticazione e autorizzazione oauth; per
	eventuali informazioni riferirsi al seguente link: https://dev.twitter.com/oauth/3-legged.
	Inoltre, per poter inviare il tweet con le informazioni relative ad un viaggio è stata utilizzata
	la chiamata POST statues/update.

Inve con le API rest di Viaggiatreno si ottiene l' elenco delle stazioni, con relative informazione, il cui nome inizia con una
	certa stringa e inoltre si ottiene l'elenco delle soluzioni di viaggio che collegano 2 particolari stazioni
	Per ulteriori informazioni riferirsi al seguente link: https://github.com/Razorphyn/Informazioni-Treni-Italiani
	
Servizio di messaggeria asincrona:
	Rabbitmq è il servizio scelto. E' stato implementato nel seguente modo: si utilizza una singola coda
	di messaggi denominata 'hello' in cui viene inviato un messaggio ogni qual volta un utente accede 
	all'homepage dell'applicazione. Il server di rabbitmq si attiva all'avvio dell'applicazione ed ogni minuto 
	legge i messaggi presenti nella coda e per ciascun messaggio letto incrementa di 1 il valore di due contatori.
	Il primo tiene conto delle visite giornaliere (viene azzerato ogni 24 ore), il secondo tiene conto delle visite totali.
	Ogni volta che un utente clicca sul secondo bottone presente sulla homepage, viene rimandato in una pagina in cui 
	visualizza il numero di visite totali e giornaliere.
	Per ulteriori informazioni sul servizio riferirsi al seguente link: https://www.rabbitmq.com/
