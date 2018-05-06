'use strict';

const LocaleKit = require('./../locale-kit.js');

let path = 'demo.db';

function execute(){
	let start = process.hrtime();
	let pack = new LocaleKit.Package();
	pack.setVerbose(true);
	if ( typeof(cache) === 'object' ){
		//Set up cache.
		pack.setCache(true).setCacheHandler(cache);
	}
	//Setting the path to the package.
	console.log('Setting package path...');
	pack.setPath(path).then(() => {
		console.log('Connected to package, trying to set "en-US" as locale...');
		//Setting the locale code...
		pack.setLocale('en-US', false).then(() => {
			//Checking if the locale that has been set is a fallback or is the same that has been specified.
			if ( pack.isFallback() === true ){
				console.log('"en-US" appears to be not supported by the package, falling back to another English variant if available...');
				//Getting the fallback locale selected by the library.
				console.log('Locale has been set to "' + pack.getLocale() + '", now getting labels with IDs 1, 2 and 3...');
			}else{
				console.log('Locale has been set, now getting labels with IDs 1, 2 and 3...');
			}
			//Getting the labels by their IDs.
			pack.getLabels([1, 2, 3]).then((labels) => {
				console.log('Labels fetched, here you are the label with ID 2: ' + labels[2]);
				console.log('Fetching all languages supported by this package...');
				//Getting the list of all the languages supproted by the package.
				pack.getSupportedLocales().then((locales) => {
					locales = locales.map((element, index) => {
						return element.locale;
					});
					console.log('This package supports these locales: ' + locales.join(', ') + '.');
					console.log('Checking if Italian is supported by the package...');
					//Checking if a specific locale is supported by the package.
					pack.isLocaleSupported('it').then((result) => {
						console.log('Is Italian supported? ' + ( result === true ? 'Yes' : 'No' ) + '.');
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
					});
				}).catch((ex) => {
					console.log(ex);
				});
			}).catch((ex) => {
				console.log(ex);
			});
		}).catch((ex) => {
			console.log(ex);
		});
	}).catch((ex) => {
		console.log(ex);
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