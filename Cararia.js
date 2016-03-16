// Librerie necessarie

var express=require("express");
var fs=require("fs");
var request=require("request")
var syncRequest = require('sync-request');
var qs = require("querystring");
var percentEncode = require('oauth-percent-encode');
var session = require('client-sessions');
var amqp = require('amqplib/callback_api');

var app=express();

/*__________________________________________________
 * Definisco un cookie per mantenere lo stato di un utente
 * _________________________________________________*/
app.use(session({
  cookieName: 'session',
  secret: 'qazxswedc'
}));

app.set('view engine', 'ejs');


//Definizione  delle variabili globali
var PORTA=3000
var INDIRIZZO="http://127.0.0.1"
var NUMERO_VISITE=0;
var NUMERO_VISITE_GIORNALIERE=0;


// Inizio Receiver
/*_________________________________________________________________________________________________________________________________________________
 *Ogni minuto leggo i messaggi presenti nella coda 'hello' di rabbit-mq contando quanti sono e aggiornando quindi la variabile globale che mantiene il numero totale di visite
 * _________________________________________________________________________________________________________________________________________________*/
setInterval(function(){
	amqp.connect('amqp://guest:guest@localhost:5672', function(err, conn) {		
		conn.createChannel(function(err, ch) {			
		var q = 'hello';																	
		ch.assertQueue(q, {durable: false});
		ch.consume(q, function(msg) {
			NUMERO_VISITE++;
			NUMERO_VISITE_GIORNALIERE++;
			}, {noAck: true} );
		});
	setTimeout(function() {conn.close() }, 1000); 
	}) 
},60*1000);


setInterval(function(){
	NUMERO_VISITE_GIORNALIERE=0;
},24*60*60*1000);



// Fine Receiver



/*______________________________________________________________________________
 *Definisco una funziona che chiama una certa funzione fn 15 minuti prima di una certa data d
 * ______________________________________________________________________________*/
function waithForDate(fn, d){
    var t = d.getTime() - (new Date()).getTime()-15*60*1000;
    return setTimeout(fn, t);
}



/*____________________________________________________________________________________________________
 *Definisco la url a cui andra chiesto il token per l' autenticazione con twitter
 * ____________________________________________________________________________________________________*/
var requestTokenUrl = "https://api.twitter.com/oauth/request_token";


/*____________________________________________________________________________________________________
 *Chiavi assegnate da twitter all'app Cararia che offre il servizio
 * ____________________________________________________________________________________________________*/
var CONSUMER_KEY = "pBmDZZnfK3LrUiM940UaG7SqD";
var CONSUMER_SECRET = "VLIj2EF0BMOEaTSHFw04GTOPzueDwgdDznZqrjB5VraJNvBCIk";

/*____________________________________________________________________________________________________
 *Definisco l' oggetto oauth che andrà inviato come parametro per la richiesta del token per l' autenticazione con twitter
 * ____________________________________________________________________________________________________*/
var oauth = {
	callback : INDIRIZZO+":"+PORTA+"/autenticato",
	
	consumer_key  : CONSUMER_KEY,
	consumer_secret : CONSUMER_SECRET
}


var home=fs.readFileSync('home.html',"utf8");
var form_p=fs.readFileSync('form_partenza.html',"utf8");


/*___________________________________________________________________________________________
 * Definisco la funzione di call-back al click sul pulsante di submit delle form delle stazioni di partenza e arrivo,
 * che utilizzera le API offerte dal servizio REST viaggiatreno per permettere all'utente di selezionare una
 * particolare stazione a partire anche solo dalle prime lettere del suo nome
 * __________________________________________________________________________________________*/
var submit_stazione_handler=function(req,res){
	var url="http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/autocompletaStazione/"+ req.query.staz;
	var testo="";
	request.get(url,function(err,response,body){
		console.log(err);
		
		//controllo se il riultato è vuoto, se è vuoto mando messaggio di errore!
		if (body==undefined) {
				var target;
				if(req.query.tappa=="partenza")
					res.send('<html><head><meta charset="utf-8"> <title>Cararia</title></head><body><h1>Errore!</h1>Il nome inserito non corrisponde a nessuna stazione, se si vuole riprovare <a href="'+INDIRIZZO+":"+PORTA+'/reinserisci_partenza">cliccare qui </a></body></html>')
				else
					res.send('<html><head><meta charset="utf-8"> <title>Cararia</title></head><body><h1>Errore!</h1>Il nome inserito non corrisponde a nessuna stazione, se si vuole riprovare <a href="'+INDIRIZZO+":"+PORTA+'/partenza_selezionata?stazione='+req.query.cod_part+"|"+req.query.partenza+'">cliccare qui </a></body></html>')
		}
				
		else{
			
			var arr_linee=body.split('\n');
			arr_linee.pop();
			var arr_coppie=new Array (arr_linee.length);
			arr_linee.forEach(function(a,ind){
				arr_coppie[ind]=a.split('|') });
				
			testo+='<HTML><HEAD><TITLE> Selezione stazione</TITLE></HEAD><BODY ><div/><FORM action="/'+req.query.tappa+'_selezionata"  method="get" >'
			testo+='<fieldset>'
			testo+='<legend>Scegliere la stazione:</legend>'
			arr_coppie.forEach(function(a,ind){
				testo+='<div/>'
				testo+='<div/>'
				testo+='<input type="radio" value="' 
				testo+=a[1]+'|'+a[0]+'"'
				testo+='name="stazione"'
				testo+=' required'
				testo+='/>'
				testo+=a[0]
				})
				
			testo+='<div/>'
			if(req.query.partenza!=undefined){
				testo+='<input type="hidden" name="partenza" value="'+req.query.partenza+'" required />'
				testo+='<input type="hidden" name="cod_part" value="'+req.query.cod_part+'" required />'
			}
			
			testo+='<input type="submit" value="Seleziona" id="btnSend"  />'
			testo+='</fieldset>'
			testo+='</FORM></BODY></HTML>'
			
			console.log("finito");
			res.send(testo);
			
		}
		
	});

}
	



var home_handler=function(req,res){ 

	// Inizio Sender
	
	/*____________________________________________________________________________________________________
	 *Ad ogni accesso alla home page registro l' avvenuto accesso al sito inviando un messaggio alla coda 'hello' di rabbit-mq
	 * ____________________________________________________________________________________________________*/
	amqp.connect('amqp://guest:guest@localhost:5672', function(err, conn) {
	  conn.createChannel(function(err, ch) {
	    var q = 'hello';
	
	    ch.assertQueue(q, {durable: false});
	    ch.sendToQueue(q, new Buffer('Benvenuto!'));
	    console.log(" [x] Sent 'Benvenuto!'");
	  });
	});
	
	
	
	// Fine Sender
	
	res.send(home);
}


/*____________________________________________________________________________________________________
	 *Accedendo alla pagina /visitatori viene visitato il numero totale  di utenti che hanno utilizzato il sevizio e quelli che lo hanno utilizzato in quel giorno 
	 * ____________________________________________________________________________________________________*/
app.get("/visitatori",function(req,res){
	var s='<html><head><meta charset="utf-8"> <title>Cararia</title></head><body><h1>Visitatori</h1>Il numero totale  di utenti che hanno utilizzato il sevizio è ' + NUMERO_VISITE
	s+="<div>Il numero totale  di utenti che hanno utilizzato il sevizio nell' ultima ora è  " + NUMERO_VISITE_GIORNALIERE+'</body></html>'
	res.send(s)
	});



app.get("/",home_handler);



app.get("/autenticati", function (req, res) {
	
/*____________________________________________________________________________________________________
 *Richiedo il token a twitter che servirà poi a richiedere l' autorizzazione a twitter
 * ____________________________________________________________________________________________________*/
	request.post({url : requestTokenUrl, oauth : oauth}, function (e, r, body){
		
		
		reqData = qs.parse(body);
		
		console.log("-------Body_post_request_token_url=");
		console.log(reqData)
		
		var oauthToken = reqData.oauth_token;
		
		var uri = 'https://api.twitter.com/oauth/authorize' + '?' + "oauth_token="+oauthToken
		console.log("-------Oauth_token=");
		console.log(oauthToken);
		//LLLLLLLLLLrequest.get(uri,function(er,re,bo){
/*____________________________________________________________________________________________________
 *Reindirizzo l'utente alla pagina di twitter dove dovrà autorizzare l' applicazione Cararia, e una volta autorizzato l'utente
 *  verra di nuovo reindirizzato alla url di callback  "/autenticato" indicata nell'oggetto oauth passato come parametro alla post precedente
 * ____________________________________________________________________________________________________*/
		res.send('<html><head><meta charset="utf-8"> <title>Cararia</title></head><body><h1>Autorizzazione App</h1><a href='+uri+' >Esegui l accesso a Twitter </a></body></html>')
		//LLLLLLLL});
	});

});



app.get("/autenticato",function(req,res){
		var authReqData = req.query;
		
		var oauth_autenticato= {
		token : authReqData.oauth_token,
		token_secret  : reqData.oauth_token_secret,
		verifier : authReqData.oauth_verifier
		}

	
/*____________________________________________________________________________________________________
 *Richiesta a twitter dell access token che permetterà, nel nostro specifico, di inviare un twitter da parte dell' utente
 * ____________________________________________________________________________________________________*/
		var accessTokenUrl = "https://api.twitter.com/oauth/access_token";
		request.post({url : accessTokenUrl , oauth : oauth_autenticato}, function(e, r, body){
			 var authenticatedData= qs.parse(body);
			 //Creo una variabile di sessione authenticatedData in cui salvo l' access token appena ottenuto
			req.session.authenticatedData=authenticatedData
		
		//L' utente inizia cosi la compilazione dei campi relativi al viaggio
		res.send(form_p)
			
	});
		
		
});


app.get("/reinserisci_partenza",function(req,res){res.send(form_p)});


/*____________________________________________________________________________________________________________________________
 *I due seguenti indirizzi, "/submit_partenza" e "/submit_destinazione" , sono quelle a  cui rimandano rispettivamente le form, partenza e destinazione
 * ____________________________________________________________________________________________________________________________*/
app.get("/submit_partenza/",submit_stazione_handler);

app.get("/submit_destinazione/",submit_stazione_handler);

app.get("/partenza_selezionata/",function(req,res){
	var stazione=req.query.stazione.split("|");
	var cod_part=stazione[0];
	var partenza=stazione[1];
	res.render('form_destinazione',{cod_part:cod_part,partenza:percentEncode(partenza)});
});

app.get("/destinazione_selezionata/",function(req,res){//"/orario"
	var stazione=req.query.stazione.split("|");
	var cod_dest=stazione[0];
	var destinazione=stazione[1];
	var d =new Date()
	res.render('form_orario',{cod_part:req.query.cod_part,partenza:req.query.partenza,cod_dest:cod_dest,destinazione:percentEncode(destinazione),g:d.getDate(),m:d.getMonth()+1,a:d.getFullYear(),or:d.getHours(),mi:d.getMinutes()});
});


/*____________________________________________________________________________________________________________________________
 *Una volta selezionati, stazione di partenza e arrivo e l'orario viene fatta una richiesta, tramite un' API rest offerta da trenitalia, delle possibili soluzioni
 *  di viaggio disponibili  che vengono cosi offerte all'utente che sceglierà quella esatta
 * ____________________________________________________________________________________________________________________________*/
app.get("/orario_selezionato/",function(req,res){//"/Scegli  soluzione"
	var a_scelto=req.query.anno
	var m_scelto=req.query.mese
	var g_scelto=req.query.giorno
	var cod_orario=a_scelto+"-"
	if(m_scelto<10) cod_orario+="0";
	cod_orario+=m_scelto+"-"
	if(g_scelto<10) cod_orario+="0";
	cod_orario+=g_scelto+"T"
	if(req.query.ora<10) cod_orario+="0";
	cod_orario+=req.query.ora+":"
	if(req.query.minuto<10) cod_orario+="0";
	cod_orario+=req.query.minuto+":00"
	var url="http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/soluzioniViaggioNew/"+req.query.cod_part.substring(1)+"/"+req.query.cod_dest.substring(1)+"/"+cod_orario
	console.log("url");
	console.log(url);
	request.get(url,function(err,response,body){
		
		var body=JSON.parse(body)
		if(body==null || body.soluzioni==null || body.soluzioni.length==0)  res.send('<html><head><meta charset="utf-8"> <title>Cararia</title></head><body><h1>Errore!</h1>Non è stata trovato nessuna soluzione di viaggio corrispondente,<a href="'+INDIRIZZO+":"+PORTA+'/reinserisci_partenza">cliccare qui </a>per reinserire i dati del viaggio</body></html>')
		else{
		var soluzioni=body.soluzioni

		var testo=""
		var t_descr=""
		var descr_tweet=""
		var	descr=""
		var	p=""
		var	a=""
		var	or_p=""
		var	or_a=""
		
		var giorno_p
		var mese_p
		var anno_p
		var ora_p
		var minuti_p
				
		var giorno_a
		var mese_a
		var anno_a
		var ora_a
		var minuti_a
		
		
		
		
		
		testo+='<HTML>\n<HEAD>\n<TITLE> Selezione soluzione</TITLE>\n</HEAD>\n<BODY >\n<div/><FORM action="/soluzione_selezionata"  method="get" required >\n'
		testo+='<table cellspacing=5>\n'
		testo+="<tr>\n<th></th><th>Da</th><th>Ora</th><th>A</th><th>Ora</th><th>Tipologia</th><th>N treno</th><th>Durata</th><th>Giorno</th>\n</tr>\n"
		
		
			soluzioni.forEach(function(sol,ind_s){
			t_descr=""
			descr_tweet=""
			descr=""
			var durata=sol.durata
			//console.log(durata)
			n_tratte=sol.vehicles.length
			testo+='<tr>\n<td><input type="radio" value='+"'"+JSON.stringify(sol)+"'"+' name="soluzione" required /></td>'
			sol.vehicles.forEach(function(tratta,ind_t){
				p=tratta.origine
				a=tratta.destinazione
				or_p=tratta.orarioPartenza
				or_a=tratta.orarioArrivo
				
				//console.log(p+a+"\n")
				giorno_p=or_p.substring(8,10)
				mese_p=or_p.substring(5,7)
				anno_p=or_p.substring(0,4)
				ora_p=or_p.substring(11,13)
				minuti_p=or_p.substring(14,16)
				
				giorno_a=or_a.substring(8,10)
				mese_a=or_a.substring(5,7)
				anno_a=or_a.substring(0,4)
				ora_a=or_a.substring(11,13)
				minuti_a=or_a.substring(14,16)
				
				if(ind_t>0) descr+="<tr>\n<td></td>"
				//if (parseInt(giorno_p)!=parseInt(g_scelto) )		 testo+="</div>ORARI DEL GIORNO "+giorno_p+"/"+mese_p+"/"+anno_p+"</div>"
				descr+="<td>"+p+"</td><td>"+ora_p+":"+minuti_p+"</td><td>"+a+"</td><td>"+ora_a+":"+minuti_a+"</td><td>"+tratta.categoriaDescrizione+"</td><td>"+tratta.numeroTreno+"</td>\n"
				if(ind_t==0) descr+="<td>"+durata+"</td>"+"<td>"+giorno_p+"/"+mese_p+"/"+anno_p+"</td>"
				else descr+="<td></td>"
				descr+="\n</tr>\n"
				
				//descr_tweet+="\n"+percentEncode(descr)
			});
			testo+=descr
			//arr_descr.push(descr_tweet)
		});
		
		testo+='<div/>'
		testo+='<tr>\n<td><input type="submit" value="Seleziona"    /></td>\n</tr>\n'
		testo+='</table>\n'
		testo+='<input type="hidden" name="partenza" value="'+req.query.partenza+'" required />'
		testo+='<input type="hidden" name="destinazione" value="'+req.query.destinazione+'" required />'
		testo+='</FORM>\n'
		
		//testo+='<script type="text/javascript"> function submitform(){  alert("Sending Json");  var xhr = new XMLHttpRequest();   xhr.open(form.method, form.action, true);    xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");  var soluzioni =' +JSON.stringify(soluzioni)+';+var ind=form.soluzione.value; var j=soluzioni[ind]'+' xhr.send(JSON.stringify(j));'
		
		testo+='</BODY>\n</HTML>'
		//console.log(testo)
		res.send(testo)
	}
	});
});








/*_______________________________________________________________________________________________________________
 *Una volta che l'utente ha selezionato la soluzione di viaggio che  verrà da lui intrapresa, viene costruito il tweet  corrispondente al
 *   viaggio(recuperando se disponibili i nomi delle citta in cui si trovano le stazioni)  che verrà inviato 15 minuti prima della prtenza
 * _______________________________________________________________________________________________________________*/
app.get("/soluzione_selezionata", function(req, res){

	var testo_tweet="";
	
			
		console.log("req:");
		console.log(req.query);
	

		
		var sol=JSON.parse(req.query.soluzione);
		
		or_p=sol.vehicles[0].orarioPartenza
		or_a=sol.vehicles[sol.vehicles.length-1].orarioArrivo
		
		giorno_p=or_p.substring(8,10)
		mese_p=or_p.substring(5,7)
		anno_p=or_p.substring(0,4)
		ora_p=or_p.substring(11,13)
		minuti_p=or_p.substring(14,16)
		
		giorno_a=or_a.substring(8,10)
		mese_a=or_a.substring(5,7)
		anno_a=or_a.substring(0,4)
		ora_a=or_a.substring(11,13)
		minuti_a=or_a.substring(14,16)
		
		
		var d=new Date(anno_p,mese_p-1,giorno_p,ora_p,minuti_p,0,0)
		
		var url_base="http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/cercaStazione/"
		var url=url_base+req.query.destinazione;
		
		request.get(url,function(err,response,body){
			console.log("url:")
			console.log(url)
			body=JSON.parse(body)
			console.log("body:")
			console.log(body)
			var nome_destinazione ;
			if(body[0].label!=null) nome_destinazione=body[0].label;
			else nome_destinazione=body[0].nomeLungo;
			testo_tweet+=percentEncode(nome_destinazione.toUpperCase()+" ARRIVO!!!!")
			
			var url=url_base+req.query.partenza;
			request.get(url,function(err,response,body){
				console.log("url:")
				console.log(url)
				body=JSON.parse(body)
				console.log("body:")
				console.log(body)
				var nome_partenza;
				if(body[0].label!=null) nome_partenza=body[0].label;
				else nome_partenza=body[0].nomeLungo;
				testo_tweet+="\n"+percentEncode("Parto da "+nome_partenza.substring(0,1).toUpperCase()+nome_partenza.substring(1).toLowerCase()+" il ")
				testo_tweet+=percentEncode(giorno_p+"/"+mese_p+"/"+anno_p+" alle "+ora_p+":"+minuti_p)
				testo_tweet+=percentEncode(" e arrivo alle ")
				testo_tweet+=percentEncode(ora_a+":"+minuti_a+".")
				var testo_comm_tweet=null;
				
				var authenticatedData=req.session.authenticatedData
			
				if (sol.vehicles.length>1) {

						console.log("prima\n");
					testo_comm_tweet=itera(sol);
						console.log("dopo\n");
						
					//manda_tweet(testo_tweet,authenticatedData,res,true)
				}
				
				if (testo_comm_tweet!=null){
					//var mill_mancanti=d.getTime()-Date.now();
					console.log("data partenza: "+d);
					waithForDate(function(){
						manda_tweet(testo_tweet,testo_comm_tweet,authenticatedData,res,true);
						}, d);
						//},15*60*1000);
				}
				else {
					//var mill_mancanti=d.getTime()-Date.now();
					console.log("data partenza: "+d);
					waithForDate(function(){
						manda_tweet(testo_tweet,testo_comm_tweet,authenticatedData,res,false);
						}, d);
						//}, 15*60*1000);
					
					//manda_tweet(testo_tweet,authenticatedData,res,false)
				}
			})
			
			
		})
		res.send('<html><head><meta charset="utf-8"> <title>Cararia</title></head><body><h1>Bene  </h1><h3>Il tuo messaggio verra inviato un quarto'+" d'ora prima della partenza"+" </h3><h4>Se vuoi inviare un ulteriore messaggio allora <a href='"+INDIRIZZO+':'+PORTA+"'/>clicca quì</a></body></html>")
	
			
		
});


function itera(sol){
	var ris="";
	var response;
	var body
	sol.vehicles.forEach(function(el_i,ind){
		if (ind>0 && ind<sol.vehicles.length){
			url="http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/cercaStazione/"+el_i.origine.split(".")[0]
				response =  syncRequest('GET',url);
				body=response.getBody()
				console.log("url:")
				console.log(url)
				body=JSON.parse(body)
				console.log("body:")
				console.log(body)
				var nome_citta;
				if(body[0]!=undefined ) {
					nome_citta=body[0].label
				}
				else {
					nome_citta=el_i.origine
				}
				if (nome_citta!=null) {
					ris+=percentEncode(nome_citta+",")
			     }
			
		}
	});
	
	if (ris!="") return "Passo per "+ris;
	else return null;
}
	


/*_____________________________________________________________________________________________________________________________
 *Definisco la funzione con cui mandare il tweet e nel caso di presenza di città  di passaggio verrà mandato un secondo tweet come risposta al primo
 * _____________________________________________________________________________________________________________________________*/
function manda_tweet(testo_tweet,testo_comm_tweet,authenticatedData,res,cond){

var url = "https://api.twitter.com/1.1/statuses/update.json?status="+testo_tweet.substring(0,139)
console.log("------------TWEET: "+testo_tweet)
console.log("------------URL: "+url)
var params = {
consumer_key : CONSUMER_KEY,
consumer_secret : CONSUMER_SECRET,
token: authenticatedData.oauth_token,
token_secret : authenticatedData.oauth_token_secret

};


request.post({url:url, oauth:params}, function(error, response, body) {

if (error){ console.log ("c'e stato un errore:"+errror)}
console.log("----------ERROR:\n"+error+"\n----------RESPONSE:\n"+response+"\n--------BODY:\n")
console.log(body)
console.log("\nFINE BODY");
if (body==""){
console.log("C'e stato un errore nella cominucazione con twitter")
//res.send("<html><head><meta charset='utf-8'> <title>Cararia</title></head><body><h1>Mhh...  </h1><h3>Il tuo messaggio non è stato inviato con successo c'è stato un errore nella comunicazione con twitter </h3><h4>Se vuoi riprovare a inviare un messaggio allora<a href=/>>clicca quì<</a></body></html>")
}
else{
body = JSON.parse(body)
console.log("\n--------BODY_parsed:\n")
console.log(body)
console.log("FINE BODY_parsed");
if (body.errors!=undefined )
//if (false) //da modificare
{
console.log("Error occured: "+ body.errors[0].code);
// res.end('Errore');
// res.render("failure");
//res.send('<html><head><meta charset="utf-8"> <title>Cararia</title></head><body><h1>Mhh...  </h1><h3>Il tuo messaggio non è stato inviato con successo poiche ha generato il seguente messaggio di errore:'+body.errors[0].message+'</h3><h4>Se vuoi riprovare a inviare un messaggio allora<a href=/>>clicca quì<</a></body></html>')
//res.send(failure);
}  
else 
{
if(cond)manda_reply_tweet(testo_comm_tweet,authenticatedData,res,body.id_str)
else {
	//res.send('<html><head><meta charset="utf-8"> <title>Cararia</title></head><body><h1>Bene  </h1><h3>Il tuo messaggio è stato inviato con successo</h3><h4>Se vuoi inviare un ulteriore messaggio allora<a href=/>>clicca quì<</a></body></html>')
}

// res.render("success");
//res.send(success);
}
}
});
};




/*____________________________________________________________________________________________
 *Definisco la funzione con cui mandare il tweet di riposta al primo nel caso di presenza di città  di passaggio
 * ____________________________________________________________________________________________*/
	
function manda_reply_tweet(testo_tweet,authenticatedData,res,ref_id){
	var screen_name=authenticatedData.screen_name;
	var url = "https://api.twitter.com/1.1/statuses/update.json?status="+percentEncode("@")+percentEncode(screen_name)+percentEncode(" ")+testo_tweet.substring(0,139)+"&in_reply_to_status_id="+ref_id
	console.log("------------TWEET: "+testo_tweet)
	console.log("------------URL: "+url)
	var params = {
		consumer_key : CONSUMER_KEY,
		consumer_secret : CONSUMER_SECRET,
		token: authenticatedData.oauth_token,
		token_secret : authenticatedData.oauth_token_secret
		
	};
	
	
	request.post({url:url, oauth:params}, function(error, response, body) {
		
		if (error){ console.log ("c'e stato un errore 2:"+errror)}
		console.log("----------ERROR 2:\n"+error+"\n----------RESPONSE 2:\n"+response+"\n--------BODY 2:\n")
		console.log(body)
		console.log("\nFINE BODY 2");
		if (body==""){
			console.log("C'e stato un errore nella cominucazione con twitter 2")
			//res.send("<html><head><meta charset='utf-8'> <title>Cararia</title></head><body><h1>Mhh...  2 </h1><h3>Il tuo messaggio non è stato inviato con successo c'è stato un errore nella comunicazione con twitter </h3><h4>Se vuoi riprovare a inviare un messaggio allora<a href=/>>clicca quì<</a></body></html>")
		}
		
		else{
			body = JSON.parse(body)
			console.log("\n--------BODY_parsed 2:\n")
			console.log(body)
			console.log("FINE BODY_parsed 2");

			//if (false) //da modificare
			if (body.errors!=undefined ){
				console.log("Error occured 2: "+ body.errors[0].code);
				// res.end('Errore');
				// res.render("failure");
				//res.send('<html><head><meta charset="utf-8"> <title>Cararia</title></head><body><h1>Mhh...  2</h1><h3>Il tuo messaggio non è stato inviato con successo poiche ha generato il seguente messaggio di errore:'+body.errors[0].message+'</h3><h4>Se vuoi riprovare a inviare un messaggio allora<a href=/>>clicca quì<</a></body></html>')
				//res.send(failure);
		}  
			else {
				console.log("2 messaggi inviati con successo");
				//res.send('<html><head><meta charset="utf-8"> <title>Cararia</title></head><body><h1>Bene  </h1><h3>Il tuo messaggio è stato inviato con successo</h3><h4>Se vuoi inviare un ulteriore messaggio allora<a href=/>>clicca quì<</a></body></html>')
				
				// res.render("success");
				//res.send(success);
			}
		}
			
	});
		
	};




var server = app.listen(PORTA, function() {
console.log(server.address());
var host = server.address().address;
var port = server.address().port;

//console.log("App in ascolto all'indirizzo http://%s:%s", host, port);
console.log("App in ascolto all'indirizzo %s:%s", INDIRIZZO, port);
} );




