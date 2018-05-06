'use strict';

const LocaleKit = require('./../locale-kit.js');

let token = 'YOUR API KEY HERE';
let translate = new Array('E la volpe con il suo balzo superò il quieto fido.', 'Ciao mondo!!');
let detect = new Array('E la volpe con il suo balzo superò il quieto fido.', 'Hello world!');

function execute(){
	let start = process.hrtime();
	let translator = new LocaleKit.Translator();
	translator.setVerbose(true);
	//Let's use Yandex.Translate as service provider using its free plan.
	translator.setupYandex(token, LocaleKit.Translator.HTML);
	if ( typeof(cache) === 'object' ){
		//Set up cache.
		translator.setCache(true).setCacheHandler(cache);
	}
	//Translate the texts from Italian to English.
	console.log('Translating some texts...');
	translator.translateText(translate, 'en', 'it').then((elements) => {
		console.log('The first text translated: ' + Object.values(elements)[0]);
		console.log('Detecting the language of some texts...');
		//Detect the language of some texts.
		translator.detectLanguage(detect).then((elements) => {
			console.log('Language detection for the text "E la volpe con il suo balzo superò il quieto fido": ' + elements[detect[0]]);
			console.log('Language detection for the text "Hello world!": ' + elements[detect[1]]);
			console.log('Fetching a list of all supported languages from the provider...');
			//Fetching a list of all supported languages from the provider.
			translator.getSupportedLanguages('en').then((elements) => {
				console.log('This provider supports these languages: ' + Object.values(elements).join(', '));
				if ( typeof(cache) === 'object' ){
					console.log('Invalidating the cache...');
					//Removing all cached data.
					cache.invalidate().then(() => {
						console.log('Demo completed in ' + ( process.hrtime(start)[1] / 1e9 ) + ' seconds.');
						process.exit();
					}).catch((ex) => {
						console.log(ex);
						process.exit();
					});
				}else{
					console.log('Demo completed in ' + ( process.hrtime(start)[1] / 1e9 ) + ' seconds.');
					process.exit();
				}
			}).catch((ex) => {
				console.log(ex);
				process.exit();
			});
		}).catch((ex) => {
			console.log(ex);
			process.exit();
		});
	}).catch((ex) => {
		console.log(ex);
		process.exit();
	});
}

if ( process.argv.indexOf('--cache') !== -1 ){
	var TinyCacher = require('tiny-cacher');
	var cache = new TinyCacher();
	
	//Setting up cache.
	console.log('Running the test script with caching enabled...');
	cache.setStrategy(TinyCacher.STRATEGY_REDIS).setNamespace('demo').setVerbose(true).connectToRedis({
		host: '127.0.0.1'
	}, 0).then(() => {
		console.log('Cache ready, starting the demo script...');
		execute();
	}).catch((ex) => {
		console.log(ex);
		process.exit();
	});
}else{
	console.log('Running the test script with caching disabled...');
	execute();
}