'use strict';

const sqlite3 = require('sqlite3');
const https = require('https');
const querystring = require('querystring');
const crypto = require('crypto');

var LocaleKit = {
	/**
	* Sends an HTTPS request to a given URL, this method is asynchronous with promise support.
	*
	* @param String url A string containing the URL.
	* @param Object params An object containing the additional parameters that shall be sent as POST parameters.
	* 
	* @return String A string containing the response returned by the server.
	*
	* @throws exception If an invalid URL is given.
	* @throws exception If the request fails.
	*/
	sendRequest: function(url, params){
		return new Promise((resolve, reject) => {
			if ( typeof(url) !== 'string' || url === '' ){
				return reject('Invalid URL.');
			}
			let index = url.indexOf('://');
			if ( index > 0 ){
				url = url.substr(index + 3);
			}
			index = url.indexOf('/');
			let options = {
				hostname: url,
				path: '/',
				port: 443
			};
			options.hostname = url;
			options.path = '/';
			if ( index > 0 ){
				options.hostname = url.substr(0, index);
				options.path = url.substr(index);
			}
			let post = typeof(params) === 'object' && params !== null ? true : false;
			if ( post === true ){
				var data = querystring.stringify(params);
				options.method = 'POST';
				options.headers = {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Content-Length': Buffer.byteLength(data)
				};
			}
			let request = https.request(options, (response) => {
				response.setEncoding('UTF-8');
				let content = '';
				response.on('data', (data) => {
					content += data;
				});
				response.on('end', () => {
					return resolve(content);
				});
				response.on('error', () => {
					return reject('An error occurred while getting the data.');
				});
			});
			if ( post === true ){
				request.write(data);
			}
			request.end();
		});
	},
	
	Package: class{
		/**
		* Sets the parameters for the package that contains the labels, once the parameters have been set, a connection with the database will be done, the connection is asynchronous with promise support.
		*
		* @param String path A string containing the path to the SQLite database.
		* @param String locale A string containing the locale code, alternatively, the language code will be extracted if the given locale code were not found within the database (en-US => en).
		* @param Boolean strict If set to "true" only the locale code will be used, if not supported by the package will be thrown an exception instead of looking for the language code.
		* 
		* @return String A string containing the locale code that has been set, this can be useful when using fallback locales.
		*
		* @throws exception If an invalid path is given.
		* @throws exception If an invalid locale code is given.
		* @throws exception If an error occurs while connecting to the package.
		* @throws exception If an error occurs while setting the locale for the given package.
		*/
		setPackage(path, locale, strict){
			return new Promise(function(resolve, reject){
				if ( typeof(path) !== 'string' || path === '' ){
					return reject('Invalid path.');
				}
				if ( typeof(locale) !== 'string' || locale === '' ){
					return reject('Invalid locale code.');
				}
				let verbose = this.getVerbose();
				this.setPath(path).then(function(){
					this.setLocale(locale, strict).then((locale) => {
						return resolve(locale);
					}).catch((ex) => {
						if ( verbose === true ){
							console.log(ex);
						}
						return reject('An error occurred while setting the locale.');
					});
				}.bind(this)).catch((ex) => {
					if ( verbose === true ){
						console.log(ex);
					}
					return reject('An error occurred while setting up the package.');
				});
			}.bind(this));
		}
		
		/**
		* Sets the path to the database containing the labels, once a path has been set, a connection with the database will be done, the connection is asynchronous with promise support.
		*
		* @param String path A string containing the path to the SQLite database.
		* 
		* @throws exception If an invalid path is given.
		* @throws exception If an error occurrs while connecting to the package.
		*/
		setPath(path){
			return new Promise(function(resolve, reject){
				if ( typeof(path) !== 'string' || path === '' ){
					return reject('Invalid path.');
				}
				let verbose = this.getVerbose();
				this.path = path;
				this.locale = null;
				this.localeID = null;
				this.fallback = false;
				this.connection = null;
				this.connectToPackage().then(() => {
					return resolve();
				}).catch((ex) => {
					if ( verbose === true ){
						console.log(ex);
					}
					return reject('An error occurred while connecting to the package.');
				});
			}.bind(this));
		}
		
		/**
		* Returns the path to the database containing the labels.
		*
		* @return String A string containing the path to the SQLite database or an empty string if no path has been set.
		*/
		getPath(){
			return typeof(this.path) === 'string' ? this.path : '';
		}
		
		/**
		* Sets if errors shall be displayed in console or not, this method is chainable.
		*
		* @param Boolean verbose If set to "true", every error will be displayed in console, otherwise not.
		*/
		setVerbose(verbose){
			this.verbose = typeof(verbose) === 'boolean' && verbose === true ? true : false;
			return this;
		}
		
		/**
		* Returns if errors shall be displayed in console or not.
		*
		* @return Boolean If errors are going to be displayed in console will be returned "true", otherwise "false".
		*/
		getVerbose(){
			return typeof(this.verbose) === 'boolean' ? this.verbose : false;
		}
		
		/**
		* Sets if the labels read from the database shall be stored within the cache for next uses or not, this method is chainable.
		*
		* @param Boolean cache If set to "true" results will be cached, otherwise not.
		*/
		setCache(cache){
			this.cache = cache === true ? true : false;
			return this;
		}
		
		/**
		* Returns if the labels read from the database shall be stored within the cache for next uses or not.
		*
		* @return Boolean If results are going to be cached will be returned "true", otherwise "false".
		*/
		getCache(){
			return typeof(this.cache) !== 'undefined' && this.cache === true ? true : false
		}
		
		/**
		* Sets the handler for cache, it must be an instance of the class "TinyCacher" from the package "tiny-cacher", to unset the handler, pass "null" as parameter, this method is chainable.
		*
		* @param TinyCacher handler An instance of the class "TinyCacher" representing that provides an API to handle data caching.
		*
		* @throws exception If an invalid class instance were given.
		*/
		setCacheHandler(handler){
			if ( handler === null ){
				this.cacheHandler = null;
				return this;
			}
			if ( typeof(handler) === 'object' && handler.constructor.name === 'TinyCacher' ){
				this.cacheHandler = handler;
				return this;
			}
			throw 'Invalid handler.';
		}
		
		/**
		* Returns the hadler used in result caching.
		*
		* @return TinyCacher An instance of the class "TinyCacher" from the package "tiny-cacher", if no handler has been defined, will be returned "null".
		*/
		getCacheHandler(){
			return typeof(this.cacheHandler) === 'object' && this.cacheHandler.constructor.name === 'TinyCacher' ? this.cacheHandler : null;
		}
		
		/**
		* Returns if the cache handler is ready or not.
		*
		* @return Boolean If the cache is ready wil be returned "true", otherwise "false".
		*/
		cacheReady(){
			return this.getCache() === true && typeof(this.cacheHandler) === 'object' && this.cacheHandler.constructor.name === 'TinyCacher' && this.cacheHandler.isReady() === true ? true : false;
		}
		
		/**
		* Tries to connect to the given database then set the connection within the class instance, the connection is asynchronous with promise support.
		*
		* @throws exception If no path has been set.
		* @throws exception If an error occurrs on the database side.
		* @throws exception If an error occurs while trying to get the package identifier used for data caching.
		*/
		connectToPackage(){
			return new Promise(function(resolve, reject){
				let path = this.getPath();
				if ( path === '' ){
					return reject('No path has been set.');
				}
				let verbose = this.getVerbose();
				this.connection = new sqlite3.Database(path, sqlite3.OPEN_READONLY, function(error){
					if ( error !== null ){
						if ( verbose === true ){
							console.log(error);
						}
						return reject('Unable to connect to the package.');
					}
					this.loadPackageIdentifier().then(function(identifier){
						this.connection.serialize(() => {
							return resolve();
						});
					}.bind(this)).catch((ex) => {
						if ( verbose === true ){
							console.log(ex);
						}
						return reject('Unable to get the package identifier.');
					});
				}.bind(this));
			}.bind(this));
		}
		
		/**
		* Sets the package identifier used in data caching, note that the identifier will be not saved within the package file, this method is chainable.
		*
		* @param String identifier A string containinig the package identifier, if set to null, no identifier will be used.
		*
		* @throws exception If no package has been defined.
		*/
		setPackageIdentifier(identifier){
			if ( this.connected() === false ){
				throw 'No package has been defined.';
			}
			this.packageIdentifier = typeof(identifier) === 'string' ? identifier : '';
			return this;
		}
		
		/**
		* Loads the identifier containined within the package file, this method is asynchronous with promise support.
		*
		* @return String A string containing the identifier of the package.
		*
		* @throws exception If no package has been defined.
		* @throws exception If an error occurrs on the database side.
		*/
		loadPackageIdentifier(){
			return new Promise(function(resolve, reject){
				if ( this.connected() === false ){
					return reject('No package has been defined.');
				}
				let verbose = this.getVerbose();
				this.connection.get('SELECT value FROM meta WHERE key = "identifier" LIMIT 1;', function(error, element){
					if ( error !== null ){
						if ( error.message.indexOf('no such table: meta') !== -1 ){
							this.packageIdentifier = crypto.createHash('md5').update(this.connection.filename).digest('hex');
							return resolve(this.packageIdentifier);
						}
						if ( verbose === true ){
							console.log(error);
						}
						return reject('Unable to connect to the package.');
					}
					this.packageIdentifier = element !== null && typeof(element.value) === 'string' && element.value !== '' ? element.value : crypto.createHash('md5').update(this.connection.filename).digest('hex');
					return resolve(this.packageIdentifier);
				}.bind(this));
			}.bind(this));
		}
		
		/**
		* Returns the package identifier.
		*
		* @return String A string containing the package identifier, if no identifier were found, an empty string will be returned instead.
		*
		* @throws exception If no package has been defined.
		*/
		getPackageIdentifier(){
			if ( this.connected() === false ){
				throw 'No package has been defined.';
			}
			return typeof(this.packageIdentifier) === 'string' ? this.packageIdentifier : '';
		}
		
		/**
		* Checks if a connection has been set within the class instance.
		*
		* @return Boolean If a connection were found will be returned "true", otherwise "false".
		*/
		connected(){
			return typeof(this.connection) === 'object' && this.connection instanceof sqlite3.Database && typeof(this.connection.open) !== 'undefined' && this.connection.open === true ? true : false;
		}
		
		/**
		* Returns all the locales and languages supported by the package, this method is asycnhronous with promise support.
		*
		* @return Array A sequentiall array where every locale is represented by an object.
		*
		* @throws exception If not connection with the database were found.
		* @throws exception If an error occurrs on the database side.
		*/
		getSupportedLocales(){
			return new Promise(function(resolve, reject){
				if ( this.connected() === false ){
					return reject('Not connected to the package.');
				}
				let verbose = this.getVerbose();
				this.connection.all('SELECT lang, code, id, locked FROM locales;', (error, elements) => {
					if ( error !== null ){
						if ( verbose === true ){
							console.log(error);
						}
						return reject('Unable to complete the transaction with the database.');
					}
					let ret = new Array();
					elements.forEach((element, index) => {
						ret.push({
							language: element.lang,
							locale: element.code,
							id: element.id,
							locked: element.locked === true || element.locked === 1 ? true : false
						});
					});
					return resolve(ret);
				});
			}.bind(this));
		}
		
		/**
		* Checks if a given locale is supported by the package or not, this method is asynchronous with promise support.
		*
		* @param String locale A string containing the locale code, alternatively, the language code will be extracted if the given locale code were not found within the database (en-US => en).
		* @param Boolean strict If set to "true" only the locale code will be used, if not supported by the package will be returned "false".
		*
		* @return Boolean If the given locale is supported or there is a fallback language available for this locale (if strict is not set to "true") will be returned "true", otherwise "false".
		*
		* @throws exception If an invalid locale is given.
		* @throws exception If not connection with the database were found.
		* @throws exception If an error occurrs on the database side.
		*/
		isLocaleSupported(locale, strict){
			return new Promise(function(resolve, reject){
				if ( typeof(locale) !== 'string' || locale === '' ){
					return reject('Invalid locale code.');
				}
				if ( this.connected() === false ){
					return reject('Not connected to the package.');
				}
				let verbose = this.getVerbose();
				this.connection.get('SELECT id FROM locales WHERE code = ? LIMIT 1;', [locale], function(error, element){
					if ( error !== null ){
						if ( verbose === true ){
							console.log(error);
						}
						return reject('Unable to complete the transaction with the database.');
					}
					if ( typeof(element) !== 'object' || element === null ){
						if ( strict === true ){
							return resolve(false);
						}
						let lang = locale.indexOf('-');
						if ( lang < 0 ){
							return resolve(false);
						}
						lang = locale.substr(0, lang).toLowerCase();
						this.connection.get('SELECT id FROM locales WHERE lang = ? LIMIT 1;', [lang], (error, element) => {
							if ( error !== null ){
								if ( verbose === true ){
									console.log(error);
								}
								return reject('Unable to complete the transaction with the database.');
							}
							return resolve(( typeof(element) !== 'object' || element === null ? false : true ));
						});
					}
					return resolve(true);
				}.bind(this));
			}.bind(this));
		}
		
		/**
		* Sets the locale, the method will look for the given locale within the package that has been defined, the operation is asynchronous with promise support.
		*
		* @param String locale A string containing the locale code, alternatively, the language code will be extracted if the given locale code were not found within the database (en-US => en).
		* @param Boolean strict If set to "true" only the locale code will be used, if not supported by the package will be thrown an exception instead of looking for the language code.
		*
		* @return String A string containing the locale code that has been set, this can be useful when using fallback locales.
		*
		* @throws exception If an invalid locale is given.
		* @throws exception If not connection with the database were found.
		* @throws exception If an error occurrs on the database side.
		* @throws exception If the given locale is not supported by the package that has been defined.
		*/
		setLocale(locale, strict){
			return new Promise(function(resolve, reject){
				if ( typeof(locale) !== 'string' || locale === '' ){
					return reject('Invalid locale code.');
				}
				if ( this.connected() === false ){
					return reject('Not connected to the package.');
				}
				strict = strict === true ? true : false;
				let verbose = this.getVerbose();
				this.connection.get('SELECT id FROM locales WHERE code = ? LIMIT 1;', [locale], function(error, element){
					if ( error !== null ){
						if ( verbose === true ){
							console.log(error);
						}
						return reject('Unable to connect to the package.');
					}
					if ( typeof(element) === 'object' && element !== null ){
						this.locale = locale;
						this.localeID = element.id;
						this.fallback = false;
						return resolve(locale);
					}
					if ( strict === true ){
						return reject('Unsupported locale.');
					}
					let lang = locale.indexOf('-');
					if ( lang < 0 ){
						return resolve(false);
					}
					lang = locale.substr(0, lang).toLowerCase();
					this.connection.get('SELECT id FROM locales WHERE lang = ? LIMIT 1;', [lang], function(error, element){
						if ( error !== null ){
							if ( verbose === true ){
								console.log(error);
							}
							return reject('Unable to complete the transaction with the database.');
						}
						if ( typeof(element) !== 'object' || element === null ){
							return reject('Unsupported locale.');
						}
						this.locale = lang;
						this.localeID = element.id;
						this.fallback = true;
						return resolve(locale);
					}.bind(this));
				}.bind(this));
			}.bind(this));
		}
		
		/**
		* Returns the locale that has been set.
		*
		* @return String A string containing the locale code, if no locale has been defined, an empty string will be returned instead.
		*/
		getLocale(){
			return typeof(this.locale) !== 'string' ? '' : this.locale;
		}
		
		/**
		* Returns if the current locale is a fallback obtained from the original locale or not, for example, if "en-US" has been specified but "en" or another variant like "en-UK" has been picked instead.
		*
		* @return Boolean If current locale is a fallback will be returned "true", otherwsie "false".
		*/
		isFallback(){
			return typeof(this.fallback) !== 'undefined' && this.fallback === true ? true : false; 
		}
		
		/**
		* Returns the labels from the package set, this method is asynchronous with promise support.
		*
		* @param Array labels A sequentiall array containing the identifiers of the labels that shall be returned, a number or a string can be used and internally will be converted in a single element array.
		* @param Boolean fresh If set to "true" all labels will be readed from the package without looking for them into the cache, otherwise the cache will be queried first.
		*
		* @return Object An object containing as key the label ID and as value the label itself.
		*
		* @throws exception If an invalid array is given.
		* @throws exception If not connection with the database were found.
		* @throws exception If no locale has previously been defined.
		* @throws exception If an error occurrs on the database side.
		* @throws exception If an error occurrs while fetching data from the cache.
		* @throws exception If an error occurrs while saving the data into the cache.
		*/
		getLabels(labels, fresh){
			return new Promise(function(resolve, reject){
				if ( typeof(labels) !== 'string' && Array.isArray(labels) === false || labels === '' || labels <= 0 ){
					return reject('Invalid labels.');
				}
				if ( typeof(labels) === 'string' ){
					labels = [labels];
				}
				if ( this.connected() === false ){
					return reject('Not connected to the package.');
				}
				if ( typeof(this.localeID) !== 'number' || this.localeID <= 0 ){
					return reject('No locale defined.');
				}
				labels = labels.filter((element) => {
					return ( typeof(element) === 'string' || typeof(element) === 'number' ) && element !== '' && element > 0 ? true : false;
				});
				if ( labels.length === 0 ){
					return reject('Invalid labels.');
				}
				let verbose = this.getVerbose();
				let data = {};
				let localeID = this.localeID;
				let identifier = this.getPackageIdentifier();
				if ( identifier !== '' ){
					identifier += ':';
				}
				if ( fresh !== true && this.cacheReady() === true ){
					let keys = {};
					labels.forEach((element, index) => {
						keys['localeKit.lbl:' + identifier + localeID.toString() + ':' + ( typeof(element) === 'string' ? crypto.createHash('md5').update(text).digest('hex') : element.toString() )] = element;
					});
					this.cacheHandler.pullMulti(Object.keys(keys), true).then(function(elements){
						let missing = {};
						let all = true;
						for ( let key in elements ){
							if ( elements[key] === null || typeof(elements[key]) !== 'string' ){
								missing[key] = keys[key];
								all = false;
								continue;
							}
							data[keys[key]] = elements[key];
						}
						if ( all === true ){
							return resolve(data);
						}
						let labels = Object.values(missing);
						this.connection.all('SELECT id, value FROM labels WHERE locale = ? AND id IN (' + labels.map(() => {
							return '?';
						}).join(',') + ');', [localeID].concat(labels), function(error, elements){
							if ( error !== null ){
								if ( verbose === true ){
									console.log(error);
								}
								return reject('An error occurred during database transaction.');
							}
							let buffer = {};
							let empty = true;
							keys = Object.keys(keys).reduce((obj, key) => {
							   obj[keys[key]] = key;
							   return obj;
							}, {});
							elements.forEach((element, index) => {
								data[elements[index].id] = elements[index].value;
								buffer[keys[elements[index].id.toString()]] = elements[index].value;
								empty = false;
							});
							if ( empty === true || this.cacheReady() === false ){
								return resolve(data);
							}
							this.cacheHandler.pushMulti(buffer, true).then(() => {
								return resolve(data);
							}).catch((ex) => {
								if ( verbose === true ){
									console.log(ex);
								}
								return reject('An error occurred while saving elements within the cache.');
							});
						}.bind(this));
					}.bind(this)).catch((ex) => {
						if ( verbose === true ){
							console.log(ex);
						}
						return reject('An error occurred while fetching data from the cache.');
					});
				}else{
					this.connection.all('SELECT id, value FROM labels WHERE locale = ? AND id IN (' + labels.map(() => {
						return '?';
					}).join(',') + ');', [localeID].concat(labels), function(error, elements){
						if ( error !== null ){
							if ( verbose === true ){
								console.log(error);
							}
							return reject('An error occurred during database transaction.');
						}
						elements.forEach((element, index) => {
							data[element.id] = element.value;
						});
						resolve(data);
					}.bind(this));
				}
			}.bind(this));
		}
		
		/**
		* Returns all labels matching the locale that has been set, note that cache will not be used because no label ID is specified and reading IDs from the package breaks the reason of using cache, this method is asynchronous with promise support.
		*
		* @return Object An object containing as key the label ID and as value the label itself.
		*
		* @throws exception If not connection with the database were found.
		* @throws exception If no locale has previously been defined.
		* @throws exception If an error occurrs on the database side.
		* @throws exception If an error occurrs while fetching data from the cache.
		* @throws exception If an error occurrs while saving the data into the cache.
		*/
		getAllLabels(){
			return new Promise(function(resolve, reject){
				if ( this.connected() === false ){
					return reject('Not connected to the package.');
				}
				if ( typeof(this.localeID) !== 'number' || this.localeID <= 0 ){
					return reject('No locale defined.');
				}
				let verbose = this.getVerbose();
				this.connection.all('SELECT id, value FROM labels WHERE locale = ?;', [this.localeID], function(error, elements){
					if ( error !== null ){
						if ( verbose === true ){
							console.log(error);
						}
						return reject('An error occurred during database transaction.');
					}
					let data = {};
					elements.forEach((element, index) => {
						data[element.id] = element.value;
					});
					resolve(data);
				}.bind(this));
			}.bind(this));
		}
	},
	
	Translator: class{
		/**
		* The class constructor.
		*
		* @param String|Number provider A string containing the provider name, alternatively you could use one of the predefined constants, currently only "yandex" and "google" are supported, by default "yandex" is used.
		* @param String token A string containing the token.
		*/
		constructor(provider, token){
			if ( ( typeof(provider) === 'string' || typeof(provider) === 'number' ) && typeof(token) === 'string' ){
				this.setProvider(provider).setToken(token);
			}
		}
		
		/**
		* Sets the provider to use for translations, this method is chainable.
		*
		* @param String|Number provider A string containing the provider name, alternatively you could use one of the predefined constants, currently only "yandex" and "google" are supported, by default "yandex" is used.
		*/
		setProvider(provider){
			switch ( ( typeof(provider) === 'string' ? provider.toLowerCase() : provider ) ){
				case LocaleKit.Translator.GOOGLE:
				case 'google':{
					this.provider = LocaleKit.Translator.GOOGLE;
				}break;
				case 3:
				case 'microsoft':{
					this.provider = LocaleKit.Translator.MICROSOFT;
				}break;
				default:{
					this.provider = LocaleKit.Translator.YANDEX;
				}break;
			}
			return this;
		}
		
		/**
		* Returns the provider to use for translations as numeric code, use "getProviderName" to get the provider name.
		*
		* @return Number An integer number representing the provier.
		*/
		getProvider(){
			return typeof(this.provider) === 'Number' && ( this.provider === LocaleKit.Translator.GOOGLE || this.provider === LocaleKit.Translator.MICROSOFT ) ? this.provider : LocaleKit.Translator.YANDEX;
		}
		
		/**
		* Returns the provider to use for translations.
		*
		* @return String A string containing the provider name, by default "yandex" is used.
		*/
		getProviderName(){
			switch ( this.getProvider() ){
				case LocaleKit.Translator.GOOGLE:{
					return 'google';
				}break;
				case LocaleKit.Translator.MICROSOFT:{
					return 'microsoft';
				}break;
				default:{
					return 'yandex';
				}break;
			}
		}
		
		/**
		* Returns all supported providers.
		*
		* @param Boolean numeric If set to "true" will be returned a sequentiall array contianing the identifiers of the provers as integer numbers, otherwise as strings.
		*
		* @return Array A sequentiall array of strings containing the provers identifiers.
		*/
		static getSupportedProviders(numeric){
			return numeric === true ? new Array(LocaleKit.Translator.GOOGLE, LocaleKit.Translator.MICROSOFT, LocaleKit.Translator.YANDEX) : new Array('google', 'microsoft', 'yandex');
		}
		
		/**
		* Checks if a given provider is supported.
		*
		* @param String|Number provider A string containing the provider name, alternatively you could use one of the predefined constants.
		*
		* @return Boolean If the given provider is supported will be returned "true", otherwise "false".
		*/
		static supportedProvider(provider){
			if ( typeof(provider) === 'string' ){
				return this.getSupportedProviders(false).indexOf(provider.toLowerCase()) >= 0 ? true : false;
			}
			return this.getSupportedProviders(true).indexOf(provider) >= 0 ? true : false;
		}
		
		/**
		* Sets the API token to use while querying the translation APIs (independently by the provider), this method is chainable.
		*
		* @param String token A string containing the token.
		*
		* @throws exception If an invalid token is given.
		*/
		setToken(token){
			//TODO: Add regex validation according to token format for each service provider.
			if ( typeof(token) !== 'string' || token === '' ){
				throw 'Invalid token.';
			}
			this.token = token;
			return this;
		}
		
		/**
		* Returns the API token.
		*
		* @return String A string containing the token.
		*
		* @throws exception If no token has been defined.
		*/
		getToken(){
			if ( typeof(this.token) !== 'string' || this.token === '' ){
				throw 'No token defined.';
			}
			return this.token;
		}
		
		/**
		* Sets the format of the texts that will be translated, this method is chainable.
		*
		* @param String|Number format A string containing the format name, alternatively you could use one of the predefined constants, supported formats are "text" and "HTML", if no valid format is given, "text" will be used.
		*/
		setTextFormat(format){
			switch ( ( typeof(format) === 'string' ? format.toLowerCase() : format ) ){
				case LocaleKit.Translator.HTML:
				case 'html':{
					this.textFormat = LocaleKit.Translator.HTML;
				}break;
				default:{
					this.textFormat = LocaleKit.Translator.TEXT;
				}break;
			}
			return this;
		}
		
		/**
		* Returns the format of the texts that will be translated as numeric code, use "getTextFormatName" to get the format name.
		*
		* @return Number An integer number representing the format.
		*/
		getTextFormat(){
			return typeof(this.textFormat) === 'Number' && this.textFormat === LocaleKit.Translator.HTML ? LocaleKit.Translator.HTML : LocaleKit.Translator.TEXT;
		}
		
		/**
		* Returns the format of the texts that will be translated.
		*
		* @return String A string containing the format name, by default "text" is used.
		*/
		getTextFormatName(){
			switch ( this.getTextFormat() ){
				case LocaleKit.Translator.HTML:{
					return 'HTML';
				}break;
				default:{
					return 'text';
				}break;
			}
		}
		
		/**
		* Sets the algorithm to use in translation, note that this option is supported by Google only, this method is chainable.
		*
		* @param Number translationModel An integer number representing the algorithm, you should use one of the predefined constants, by default "Neural Machine Translation" is used.
		*/
		setTranslationModel(translationModel){
			switch ( translationModel ){
				case LocaleKit.Translator.PHRASE_BASED_MACHINE_TRANSLATION:{
					this.translationModel = LocaleKit.Translator.PHRASE_BASED_MACHINE_TRANSLATION;
				}break;
				default:{
					this.translationModel = LocaleKit.Translator.NEURAL_MACHINE_TRANSLATION;
				}break;
			}
			return this;
		}
		
		/**
		* Returns the algorithm to use in translation.
		*
		* @return Number An integer number representing the algorithm.
		*/
		getTranslationModel(){
			return typeof(this.translationModel) === 'Number' && this.translationModel === LocaleKit.Translator.PHRASE_BASED_MACHINE_TRANSLATION ? LocaleKit.Translator.PHRASE_BASED_MACHINE_TRANSLATION : LocaleKit.Translator.NEURAL_MACHINE_TRANSLATION;
		}
		
		/**
		* Returns the name of the algorithm to use in translation.
		*
		* @return String A string containing the algorithm name.
		*/
		getTranslationModelName(){
			switch ( this.getTranslationModel() ){
				case LocaleKit.Translator.PHRASE_BASED_MACHINE_TRANSLATION:{
					return 'Phrase-Based Machine Translation';
				}break;
				default:{
					return 'Neural Machine Translation';
				}break;
			}
		}
		
		/**
		* Returns the code of the algorithm to use in translation.
		*
		* @return String A string containing the algorithm code.
		*/
		getTranslationModelCode(){
			switch ( this.getTranslationModel() ){
				case LocaleKit.Translator.PHRASE_BASED_MACHINE_TRANSLATION:{
					return 'pbmt';
				}break;
				default:{
					return 'nmt';
				}break;
			}
		}
		
		/**
		* Sets how profanity should be handled by the provider during text translation, note that this option is supported by Microsoft only, this method is chainable.
		*
		* @param Number profanityHandling An integer number greater or equal than one and lower or equal than 3, you should use on of the predefined constants.
		*/
		setProfanityHandling(profanityHandling){
			this.profanityHandling = profanityHandling !== LocaleKit.Translator.PROFANITY_MARKED && profanityHandling !== LocaleKit.Translator.PROFANITY_DELETED ? LocaleKit.Translator.PROFANITY_NO_ACTION : profanityHandling;
			return this;
		}
		
		/**
		* Returns how profanity should be handled by the provider during text translation.
		*
		* @return Number An integer number greater or equal than one and lower or equal than 3.
		*/
		getProfanityHandling(){
			let profanityHandling = typeof(this.profanityHandling) === 'number' ? this.profanityHandling : LocaleKit.Translator.PROFANITY_NO_ACTION;
			return profanityHandling === LocaleKit.Translator.PROFANITY_MARKED || profanityHandling === LocaleKit.Translator.PROFANITY_DELETED ? profanityHandling : LocaleKit.Translator.PROFANITY_NO_ACTION;
		}
		
		/**
		* Sets if results will be stored within the cache for next uses, this method is chainable.
		*
		* @param Boolean cache If set to "true" results will be cached, otherwise not.
		*/
		setCache(cache){
			this.cache = cache === true ? true : false;
			return this;
		}
		
		/**
		* Returns if results will be stored within the cache for next uses or not.
		*
		* @return Boolean If results are going to be cached will be returned "true", otherwise "false".
		*/
		getCache(){
			return typeof(this.cache) === 'boolean' && this.cache === true ? true : false;
		}
		
		/**
		* Sets the handler for cache, it must be an instance of the class "TinyCacher" from the package "tiny-cacher", to unset the handler, pass "null" as parameter, this method is chainable.
		*
		* @throws exception If an invalid class instance were given.
		*/
		setCacheHandler(handler){
			if ( handler === null ){
				this.cacheHandler = null;
				return this;
			}
			if ( typeof(handler) === 'object' && handler.constructor.name === 'TinyCacher' ){
				this.cacheHandler = handler;
				return this;
			}
			throw 'Invalid handler.';
		}
		
		/**
		* Returns the hadler used in result caching.
		*
		* @return An instance of the class "TinyCacher" from the package "tiny-cacher", if no handler has been defined, will be returned "null".
		*/
		getCacheHandler(){
			return typeof(this.cacheHandler) === 'object' && this.cacheHandler.constructor.name === 'TinyCacher' ? this.cacheHandler : null;
		}
		
		/**
		* Returns if the cache handler is ready or not.
		*
		* @return Boolean If the cache is ready wil be returned "true", otherwise "false".
		*/
		cacheReady(){
			return this.getCache() === true && typeof(this.cacheHandler) === 'object' && this.cacheHandler.constructor.name === 'TinyCacher' && this.cacheHandler.isReady() === true ? true : false;
		}
		
		/**
		* Sets if exceptions should be displayed in console or not, this can be very useful in debug, this method is chainable.
		*
		* @param Boolean verbose If set to "true", exceptions and error messages will be displayed in console, otherwise not.
		*/
		setVerbose(verbose){
			this.verbose = verbose === true ? true : false;
			return this;
		}
		
		/**
		* Returns if exceptions should be displayed in console or not.
		*
		* @return Boolean If exceptions and messages are going to be displayed in console, will be returned "true", otherwise "false".
		*/
		getVerbose(){
			return typeof(this.verbose) !== 'undefined' && this.verbose === true ? true : false;
		}
		
		/**
		* Sets up the class instance to use Yandex Translate APIs for translations, this method is chainable.
		*
		* @param String token A string containing the API token.
		* @param String|Number format An optional integer number representing the format of the texts that will be translated, alternatively you could use one of the predefined constants, by default "text" is used.
		*
		* @throws exception If an invalid token is given.
		*/
		setupYandex(token, format){
			if ( typeof(token) !== 'string' || token === '' ){
				throw 'No token defined.';
			}
			this.token = token;
			this.provider = LocaleKit.Translator.YANDEX;
			this.setTextFormat(format);
			return this;
		}
		
		/**
		* Sets up the class instance to use Google Cloud Translation APIs for translations, this method is chainable.
		*
		* @param String token A string containing the API token.
		* @param String|Number format An optional integer number representing the format of the texts that will be translated, alternatively you could use one of the predefined constants, by default "text" is used.
		* @param Number translationModel An optional integer number representing the algorithm to use in translations, you should use one of the predefined constants, by default "Neural Machine Translation" is used.
		*
		* @throws exception If an invalid token is given.
		*/
		setupGoogle(token, format, translationModel){
			if ( typeof(token) !== 'string' || token === '' ){
				throw 'no token defined.';
			}
			this.token = token;
			this.provider = LocaleKit.Translator.GOOGLE;
			this.setTextFormat(format);
			this.setTranslationModel(translationModel);
			return this;
		}
		
		/**
		* Returns the exception message according with the status code returned by the provider.
		*
		* @param Number code An integer number greather than zero representing the status code returned by the service provider.
		* @param Number provider An integer number representing the service provider in use.
		*
		* @return String A string containing the error description used to throw the exception.
		*/
		static getErrorMessageByErrorCode(code, provider){
			switch ( provider ){
				case LocaleKit.Translator.GOOGLE:{
					switch ( code ){
						default:{
							return 'Unexpected error from Google (' + code.toString() + ').';
						}break;
					}
				}break;
				default:{
					switch ( code ){
						case 401:{
							return 'The API key that has been set within the class instance is not valid.';
						}break;
						case 402:{
							return 'The API key that has been set within the class has been rejected by Yandex.';
						}break;
						case 404:{
							return 'Your translate limit has expired, you need to upgrade your plan or wait for limit reset.';
						}break;
						case 413:{
							return 'The provided text is too long.';
						}break;
						case 422:{
							return 'The provided text cannot be translated.';
						}break;
						case 501:{
							return 'The specified translation direction is not supported.';
						}break;
						default:{
							return 'Unexpected error from Yandex (' + code.toString() + ').';
						}break;
					}
				}break;
			}
		}
		
		/**
		* Translates a given text or multiple texts, this method is asynchronous with promise support.
		*
		* @param String|Array text A string containing the text that shall be translated, alternatively you can pass an array of strings, if Yandex is in used as provider, the string cannot be over than 10000 chars length
		* @param String locale A string containing the locale code of the language that the text shall be translated in.
		* @param String originalLocale A string containing the locale code of the text's language, if not set, it will be automatically detected by the provider.
		* @param Boolean fresh If set to "true" all translations will be made by requesting data directly to the provider ignoring cache, otherwise, if the cached has been configured, data will be searched in cache before doing the requests.
		*
		* @return Object An object containing as key the original text and as value the translated one.
		*
		* @throws exception If an invalid text is given.
		* @throws exception If the given text is over 10000 chars length, note that this exception can be thrown only when using Yandex as provider.
		* @throws exception If an invalid locale code is given as target language.
		* @throws exception If no token has previously been defined.
		* @throws exception If an error occurs during the HTTP request.
		* @throws exception If an invalid response is received from the provider.
		* @throws exception If the Yandex API key that has been set is not valid according to Yandex.
		* @throws exception If the Yandex API key that has been set has been blocked by Yandex.
		* @throws exception If daily limit of translatable chars of the Yandex API key has been reached.
		* @throws exception If the given text cannot be translated by Yandex.
		* @throws exception If the translation direction is not supported by Yandex APIs.
		* @throws exception If the request fails at Google side.
		* @throws exception If an error occurrs while fetching data from the cache.
		* @throws exception If an error occurrs while saving the data into the cache.
		*/
		translateText(text, locale, originalLocale, fresh){
			let processElements = function(elements, locale, originalLocale){
				return new Promise(function(resolve, reject){
					let provider = this.getProvider();
					let verbose = this.getVerbose();
					let url = null;
					let request = {};
					switch ( provider ){
						case LocaleKit.Translator.GOOGLE:{
							url = 'https://translation.googleapis.com/language/translate/v2';
							request.q = elements;
							request.target = locale;
							request.format = this.getTextFormatName();
							if ( typeof(originalLocale) === 'string' && originalLocale !== '' ){
								request.source = originalLocale;
							}
							request.model = this.getTranslationModelCode();
							request.key = this.getToken();
						}break;
						default:{
							url = 'https://translate.yandex.net/api/v1.5/tr.json/translate';
							request.text = elements;
							request.lang = typeof(originalLocale) === 'string' && originalLocale !== '' ? ( originalLocale + '-' + locale ) : locale;
							request.format = this.getTextFormatName().toLowerCase();
							request.key = this.getToken();
						}break;
					}
					LocaleKit.sendRequest(url, request).then((data) => {
						try{
							let ret = {};
							data = JSON.parse(data);
							switch ( provider ){
								case LocaleKit.Translator.GOOGLE:{
									if ( typeof(data.data) !== 'object' || data.data === null || typeof(data.data.translations) !== 'object' || Array.isArray(data.data.translations) === false || data.data.translations.length === 0 ){
										return reject('Invalid response from Google.');
									}
									elements.forEach((element, index) => {
										ret[element] = typeof(data.data.translations[index]) === 'object' && data.data.translations[index] !== null && typeof(data.data.translations[index].translatedText) === 'string' ? data.data.translations[index].translatedText : null;
									});
								}break;
								default:{
									if ( typeof(data.code) === 'undefined' || data.code !== 200 ){
										return reject(typeof(data.code) === 'undefined' ? 'Invalid response from Yandex.' : LocaleKit.Translator.getErrorMessageByErrorCode(data.code, 1));
									}
									if ( typeof(data.text) === 'undefined' || Array.isArray(data.text) === false ){
										return reject('Invalid response from Yandex.');
									}
									elements.forEach((element, index) => {
										ret[element] = typeof(data.text[index]) === 'string' ? data.text[index] : null;
									});
								}break;
							}
							return resolve(ret);
						}catch(ex){
							if ( verbose === true ){
								console.log(ex);
							}
							return reject('Invalid response from the provider.');
						}
					}).catch((ex) => {
						if ( verbose === true ){
							console.log(ex);
						}
						return reject('Unable to complete the request.');
					});
				}.bind(this));
			}.bind(this);
			return new Promise(function(resolve, reject){
				if ( typeof(locale) !== 'string' || locale === '' ){
					return reject('Invalid locale code.');
				}
				if ( this.getToken() === '' ){
					return reject('No token has been defined.');
				}
				if ( Array.isArray(text) === false ){
					text = new Array(text);
				}
				let provider = this.getProvider();
				let verbose = this.getVerbose();
				let invalid = false;
				text = text.filter((element, index, self) => {
					if ( element !== '' && typeof(element) === 'string' && self.indexOf(element) === index ){
						if ( provider === LocaleKit.Translator.YANDEX && element.length > 10000 ){
							invalid = true;
						}
						return true;
					}
					return false;
				});
				if ( invalid === true ){
					return reject('The given text is too long.');
				}
				if ( text.length === 0 ){
					return reject('No valid text were found.');
				}
				let data = {};
				if ( fresh !== true && this.cacheReady() === true ){
					let keys = {};
					text.forEach((element, index) => {
						keys['localeKit.translate:' + locale + ':' + crypto.createHash('md5').update(element).digest('hex')] = element;
					});
					this.cacheHandler.pullMulti(Object.keys(keys), true).then(function(elements){
						text = new Array();
						for ( let key in elements ){
							if ( elements[key] === null || typeof(elements[key]) !== 'string' ){
								text.push(keys[key]);
								continue;
							}
							data[keys[key]] = elements[key];
						}
						if ( text.length === 0 ){
							return resolve(data);
						}
						processElements(text, locale, originalLocale).then(function(elements){
							keys = Object.keys(keys).reduce((obj, index) => {
							   obj[keys[index]] = index;
							   return obj;
							}, {});
							let save = {};
							for ( let key in elements ){
								save[keys[key]] = elements[key];
								data[key] = elements[key];
							}
							this.cacheHandler.pushMulti(save, true).then(() => {
								return resolve(data);
							}).catch((ex) => {
								if ( verbose === true ){
									console.log(ex);
								}
								return reject('An error occurred while saving elements within the cache.');
							});
						}.bind(this)).catch((ex) => {
							return reject(ex);
						});
					}.bind(this)).catch((ex) => {
						if ( verbose === true ){
							console.log(ex);
						}
						return reject('An error occurred while fetching data from the cache.');
					});
				}else{
					processElements(text, locale, originalLocale).then((elements) => {
						return resolve(elements);
					}).catch((ex) => {
						return reject(ex);
					});
				}
			}.bind(this));
		}
		
		/**
		* Detects the language of a given text, then returns the language code, this method is asynchronous with promise support.
		*
		* @param String|Array text A string containing the text that shall be analyzed.
		* @param Array hints An optional sequentiall array of strings containing the codes of the languages of which the text is expected to be, note that this option is supported by Yandex only.
		* @param Boolean fresh If set to "true" all detections will be made by requesting data directly to the provider ignoring cache, otherwise, if the cached has been configured, data will be searched in cache before doing the requests.
		*
		* @return Object An object containing as key the original text and as value the detected langauge code or null if no language has been found.
		*
		* @throws exception If an invalid text is given.
		* @throws exception If the given text is over 10000 chars length, note that this exception can be thrown only when using Yandex as provider.
		* @throws exception If an invalid locale code is given as target language.
		* @throws exception If no token has previously been defined.
		* @throws exception If an error occurs during the HTTP request.
		* @throws exception If an invalid response is received from the provider.
		* @throws exception If the Yandex API key that has been set is not valid according to Yandex.
		* @throws exception If the Yandex API key that has been set has been blocked by Yandex.
		* @throws exception If daily limit of translatable chars of the Yandex API key has been reached.
		* @throws exception If the request fails at Google side.
		* @throws exception If an error occurrs while fetching data from the cache.
		* @throws exception If an error occurrs while saving the data into the cache.
		*/
		detectLanguage(text, hints, fresh){
			let processElements = function(elements, hints){
				return new Promise(function(resolve, reject){
					let provider = this.getProvider();
					let verbose = this.getVerbose();
					let token = this.getToken();
					if ( provider === LocaleKit.Translator.YANDEX ){
						//Currently Yandex seems to not support multiple text detection within a single request, we need to do multiple requests in parallel.
						let requests = new Array();
						elements.forEach((element, index) => {
							requests.push(LocaleKit.sendRequest('https://translate.yandex.net/api/v1.5/tr.json/detect', {
								key: token,
								text: element,
								hints: hints
							}));
						});
						Promise.all(requests).then((data) => {
							try{
								let ret = {};
								for ( let i = 0 ; i < elements.length ; i++ ){
									if ( typeof(data[i]) !== 'string' || data[i] === '' ){
										return reject('Invalid response from Yandex.');
									}
									data[i] = JSON.parse(data[i]);
									if ( typeof(data[i].code) !== 'number' || data[i].code !== 200 ){
										return reject(typeof(data.code) === 'undefined' ? 'Invalid response from Yandex.' : LocaleKit.Translator.getErrorMessageByErrorCode(data.code, 1));
									}
									ret[elements[i]] = typeof(data[i].lang) !== 'string' || data[i].lang === '' ? null : data[i].lang;
								}
								return resolve(ret);
							}catch(ex){
								if ( verbose === true ){
									console.log(ex);
								}
								return reject('Invalid response from the provider.');
							}
						}).catch((ex) => {
							if ( verbose === true ){
								console.log(ex);
							}
							return reject('Invalid response from the provider.');
						});
					}else{
						let url = null;
						let request = {};
						switch ( provider ){
							case LocaleKit.Translator.GOOGLE:{
								url = 'https://translate.yandex.net/api/v1.5/tr.json/translate';
								request.text = elements;
								request.key = token;
							}break;
						}
						LocaleKit.sendRequest(url, request).then((data) => {
							try{
								data = JSON.parse(data);
								let ret = {};
								switch ( provider ){
									case LocaleKit.Translator.GOOGLE:{
										if ( typeof(data.data) !== 'object' || data.data === null || typeof(data.data.detections) === 'undefined' || Array.isArray(data.data.detections) === false || data.data.detections.length === 0 ){
											return reject('Invalid response from Google.');
										}
										elements.forEach((element, index) => {
											ret[element] = typeof(data.data.detections[index]) === 'object' && data.data.detections[index] !== null && typeof(data.data.detections[index].language) === 'string' ? data.data.detections[index].language : null;
										});
									}break;
								}
								return resolve(ret);
							}catch(ex){
								if ( verbose === true ){
									console.log(ex);
								}
								return reject('Invalid response from the provider.');
							}
						}).catch((ex) => {
							if ( verbose === true ){
								console.log(ex);
							}
							return reject('Unable to complete the request.');
						});
					}
				}.bind(this));
			}.bind(this);
			return new Promise(function(resolve, reject){
				if ( this.getToken() === '' ){
					return reject('No token has been defined.');
				}
				if ( Array.isArray(text) === false ){
					text = new Array(text);
				}
				let provider = this.getProvider();
				let verbose = this.getVerbose();
				let invalid = false;
				text = text.filter((element, index, self) => {
					if ( element !== '' && typeof(element) === 'string' && self.indexOf(element) === index ){
						if ( provider === LocaleKit.Translator.YANDEX && element.length > 10000 ){
							invalid = true;
						}
						return true;
					}
					return false;
				});
				if ( invalid === true ){
					return reject('The given text is too long.');
				}
				if ( text.length === 0 ){
					return reject('No valid text were found.');
				}
				hints = typeof(hints) === 'undefined' || Array.isArray(hints) === false ? '' : hints.join(',');
				let data = {};
				if ( fresh !== true && this.cacheReady() === true ){
					let keys = {};
					text.forEach((element, index) => {
						keys['localeKit.detect:' + crypto.createHash('md5').update(element).digest('hex')] = element;
					});
					this.cacheHandler.pullMulti(Object.keys(keys), true).then(function(elements){
						text = new Array();
						for ( let key in elements ){
							if ( elements[key] === null || typeof(elements[key]) !== 'string' ){
								text.push(keys[key]);
								continue;
							}
							data[keys[key]] = elements[key];
						}
						if ( text.length === 0 ){
							return resolve(data);
						}
						processElements(text, hints).then(function(elements){
							keys = Object.keys(keys).reduce((obj, index) => {
							   obj[keys[index]] = index;
							   return obj;
							}, {});
							let save = {};
							for ( let key in elements ){
								save[keys[key]] = elements[key];
								data[key] = elements[key];
							}
							this.cacheHandler.pushMulti(save, true).then(() => {
								return resolve(data);
							}).catch((ex) => {
								if ( verbose === true ){
									console.log(ex);
								}
								return reject('An error occurred while saving elements within the cache.');
							});
						}.bind(this)).catch((ex) => {
							return reject(ex);
						});
					}.bind(this)).catch((ex) => {
						if ( verbose === true ){
							console.log(ex);
						}
						return reject('An error occurred while fetching data from the cache.');
					})
				}else{
					processElements(text, hints).then((elements) => {
						return resolve(elements);
					}).catch((ex) => {
						return reject(ex);
					});
				}
			}.bind(this));
		}
		
		/**
		* Returns a list of all the languages supported by the current service provider, this method is asynchronous with promise support.
		*
		* @param String language A string containing an optional locale code in which the language names will be returned, by default languages are returned in English.
		*
		* @return Object An object containing as key the language code and as value the language name in the language that has been specified, by default in English.
		*
		* @throws exception If no token has previously been defined.
		* @throws exception If an error occurs during the HTTP request.
		* @throws exception If an invalid response is received from the provider.
		* @throws exception If the Yandex API key that has been set is not valid according to Yandex.
		* @throws exception If the Yandex API key that has been set has been blocked by Yandex.
		* @throws exception If the request fails at Google side.
		*/
		getSupportedLanguages(language){
			return new Promise(function(resolve, reject){
				let token = this.getToken();
				if ( token === '' ){
					return reject('No token has been defined.');
				}
				let provider = this.getProvider();
				let verbose = this.getVerbose();
				let url = null;
				let request = {};
				switch ( provider ){
					case LocaleKit.Translator.GOOGLE:{
						//TODO: Add support for "model".
						url = 'https://translation.googleapis.com/language/translate/v2/languages';
						request.target = typeof(language) !== 'string' || language === '' ? 'en' : language;
						request.key = token;
					}break;
					default:{
						url = 'https://translate.yandex.net/api/v1.5/tr.json/getLangs';
						request.ui = typeof(language) !== 'string' || language === '' ? 'en' : language;
						request.key = token;
					}break;
				}
				LocaleKit.sendRequest(url, request).then((data) => {
					if ( typeof(data) !== 'string' && data === '' ){
						return reject('Invalid response from the provider.');
					}
					try{
						data = JSON.parse(data);
					}catch(ex){
						if ( verbose === true ){
							console.log(ex);
						}
						return reject('Invalid response from the provider.');
					}
					let languages = {};
					switch ( provider ){
						case LocaleKit.Translator.GOOGLE:{
							if ( typeof(data.data) !== 'object' || data.data === null || typeof(data.data.languages) === 'undefined' || Array.isArray(data.data.languages) === false || data.data.languages.length === 0 ){
								return reject('Invalid response from Google.');
							}
							data.data.languages.forEach(function(element){
								if ( typeof(element) === 'object' && element !== null && typeof(element.language) === 'string' && typeof(element.name) === 'string' && element.language !== '' && element.name !== '' ){
									languages[element.language] = element.name;
								}
							});
						}break;
						default:{
							if ( typeof(data.code) === 'number' && data.code !== 200 ){
								return reject(typeof(data.code) === 'undefined' ? 'Invalid response from Yandex.' : LocaleKit.Translator.getErrorMessageByErrorCode(data.code, 1));
							}
							if ( typeof(data.langs) !== 'object' || data.langs === null ){
								return reject('Invalid response from Yandex.');
							}
							for ( let language in data.langs ){
								if ( typeof(language) === 'string' && typeof(data.langs[language]) === 'string' && language !== '' && data.langs[language] !== '' ){
									languages[language] = data.langs[language];
								}
							}
						}break;
					}
					resolve(languages);
				}).catch((ex) => {
					if ( verbose === true ){
						console.log(ex);
					}
					return reject('Unable to complete the request.');
				});
			}.bind(this));
		}
		
		/**
		* Checks if a given language is supported by the provider in use, this method is asynchronous with promise support.
		*
		* @param String language A string containing the language code that shall be tested.
		*
		* @return Boolean If the given language is supported by the provider will be returned "true", otherwise "false".
		*
		* @throws exception If an invalid language code were given.
		* @throws exception If no token has previously been defined.
		* @throws exception If an error occurs while getting the supported languages from the provider.
		*/
		languageSupported(language){
			return new Promise(function(resolve, reject){
				if ( typeof(language) !== 'string' || language === '' ){
					return reject('Invalid language code.');
				}
				if ( this.getToken() === '' ){
					return reject('No token has been defined.');
				}
				let verbose = this.getVerbose();
				this.getSupportedLanguages('en').then((languages) => {
					return resolve(( Object.keys(languages).indexOf(language.toLowerCase()) === -1 ? false : true ));
				}).catch((ex) => {
					if ( verbose === true ){
						console.log(ex);
					}
					return reject('An error occurred while getting the supported languages from the provider.');
				});
			}.bind(this));
		}
	}
};

/**
* @const Number YANDEX Specifies that Yandex.Translate must be used as service provider, more information about this provider here: https://translate.yandex.com/developers
*/
Object.defineProperty(LocaleKit.Translator, 'YANDEX', {
	value: 1,
	writable: false,
	enumerable : true,
    configurable : false
});

/**
* @const Number GOOGLE Specifies that Google Cloud Translation must be used as service provider, more information about this provider here: https://cloud.google.com/translate/
*/
Object.defineProperty(LocaleKit.Translator, 'GOOGLE', {
	value: 2,
	writable: false,
	enumerable : true,
    configurable : false
});

/**
* @const Number MICROSOFT Specifies that the Microsoft Azure Translator Text APIs must be used as service provider, more information about this provider here: https://azure.microsoft.com/en-us/services/cognitive-services/translator-text-api/
*/
Object.defineProperty(LocaleKit.Translator, 'MICROSOFT', {
	value: 2,
	writable: false,
	enumerable : true,
    configurable : false
});

/**
* @const Number TEXT Specifies that the given texts must be handled as plain text.
*/
Object.defineProperty(LocaleKit.Translator, 'TEXT', {
	value: 1,
	writable: false,
	enumerable : true,
    configurable : false
});

/**
* @const Number HTML Specifies that the given texts must be handled as HTML code.
*/
Object.defineProperty(LocaleKit.Translator, 'HTML', {
	value: 2,
	writable: false,
	enumerable : true,
    configurable : false
});

/**
* @const Number NEURAL_MACHINE_TRANSLATION Specifies that the Neural Machine Translation (nmt) model shall be used in text translation, this option is supported by Google only, more information here: https://cloud.google.com/translate/docs/reference/translate
*/
Object.defineProperty(LocaleKit.Translator, 'NEURAL_MACHINE_TRANSLATION', {
	value: 1,
	writable: false,
	enumerable : true,
    configurable : false
});

/**
* @const Number PHRASE_BASED_MACHINE_TRANSLATION Specifies that the Phase Based Machine Translation (pbmt) model shall be used in text translation, this option is supported by Google only, more information here: https://cloud.google.com/translate/docs/reference/translate
*/
Object.defineProperty(LocaleKit.Translator, 'PHRASE_BASED_MACHINE_TRANSLATION', {
	value: 2,
	writable: false,
	enumerable : true,
    configurable : false
});

/**
* @const Number PROFANITY_NO_ACTION Specifies that no action shall be done if a text contains profanity, this option is supported by Microsoft only, more information here: http://docs.microsofttranslator.com/text-translate.html 
*/
Object.defineProperty(LocaleKit.Translator, 'PROFANITY_NO_ACTION', {
	value: 1,
	writable: false,
	enumerable : true,
    configurable : false
});

/**
* @const Number PROFANITY_MARKED Specifies that if a text contains profanity, the part must be marked using an HTML-like tag called "<profanity>", this option is supported by Microsoft only, more information here: http://docs.microsofttranslator.com/text-translate.html 
*/
Object.defineProperty(LocaleKit.Translator, 'PROFANITY_MARKED', {
	value: 2,
	writable: false,
	enumerable : true,
    configurable : false
});

/**
* @const Number PROFANITY_DELETED Specifies that if a text contains profanity, the part must be removed from the text, this option is supported by Microsoft only, more information here: http://docs.microsofttranslator.com/text-translate.html 
*/
Object.defineProperty(LocaleKit.Translator, 'PROFANITY_DELETED', {
	value: 3,
	writable: false,
	enumerable : true,
    configurable : false
});

/**
* @const String VERSION A string containing the version of this library.
*/
Object.defineProperty(LocaleKit.Package, 'VERSION', {
	value: '1.1.0',
	writable: false,
	enumerable : true,
    configurable : false
});

/**
* @const String VERSION A string containing the version of this library, alias for "LocaleKit.Package.VERSION".
*/
Object.defineProperty(LocaleKit.Translator, 'VERSION', {
	value: '1.1.0',
	writable: false,
	enumerable : true,
    configurable : false
});

exports.Package = LocaleKit.Package;
exports.Translator = LocaleKit.Translator;