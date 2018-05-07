# Locale Kit

Locale Kit is a simple library that allows to manage language packages based on SQLite3 database. It provide also utilities that allow to translate texts as well as detect their language supporting Google and Yandex as service provider.

## Usage: Package

The class "Package" allows to fetch the labels from the language package, before using it you need, of course, to set up the path to the package and the locale to use, the locale must be supported by the package, you can set a locale and allows to the library to switch to a fallback locale based on the language of the given locale code, for example, if you set "en-US" as locale but the package doesn't support it, the library will look for any locale matching with "en", unless the strict mode is enable, here you are an example:

````javascript
let pack = new LocaleKit.Package();
//path, locale, strict mode
pack.setPackage('path/to/the/package.db', 'en-US', false).then((locale) => {
	//locale is a string containing the locale code selected, if different by the given code, it means that a fallback locale has been picked.
	//Your stuff here.
}).catch((ex) => {
	//Handle errors here.
});
````

You can get a list of all the supported locales by using the following method:

````javascript
//Get all locales.
pack.getSupportedLocales().then((locales) => {
	//Your stuff here.
}).catch((ex) => {
	//Handle errors here.
});
//Check for a specific locale support.
//locale, strict mode
pack.isLocaleSupported('en-US', false).then((value) => {
	//Your stuff here.
}).catch((ex) => {
	//Handle errors here.
});
````

Now you are able to get the labels, you can use the following method passing an array containing the labels' IDs, the IDs can be represented as numbers or strings, according with the package, the labels will be returned as object having as key the label ID and as value its text, if a label were not found, it will be omitted, here's the example:

````javascript
pack.getLabels([1, 2, 3]).then((labels) => {
	//Your stuff here.
}).catch((ex) => {
	//Handle errors here.
});
````

Of course you can fetch all the labels from the package using the following method:

````javascript
pack.getAllLabels().then((labels) => {
	//Your stuff here.
}).catch((ex) => {
	//Handle errors here.
});
````

## Usage: Translator

The class "Translator" allows to translate and detect the language of texts, as of now, it support only Google and Yandex as service provider, in order to use it, you need to get an API key from the provider that you are going to use, by default, Yandex is used because it offers a free plan that allows to translate up to 10000000 chars per month, you can get a free API key from Yandex [here](https://translate.yandex.com/developers), here you are the setup example:

````javascript
let translator = new LocaleKit.Translator();
//token, text format
translator.setupYandex(['YOUR API TOKEN HERE'], LocaleKit.Translator.HTML);
````

Now you can translate one or more texts using this method:

````javascript
//text, target language, original language
translator.translateText(['Ciao mondo!'], 'en', 'it').then((texts) => {
	//Your stuff here.
}).catch((ex) => {
	//Handle errors here.
});
````

Note that you can omit the original language, in this case it will be automatically detected by the provider. The translated texts will be returned as object having as key the original text and as value the translated one. In a similar way you can detect the language of one or more texts, here you are an example:

````javascript
//text, target language, original language
translator.detectLanguage(['Ciao mondo!']).then((detections) => {
	//Your stuff here.
}).catch((ex) => {
	//Handle errors here.
});
````

It will return an object having as key the original text and as value the code of the language detected. If you need to get a list of all the languages supported by the service provider you can use the following method:

````javascript
translator.getSupportedLanguages('en').then((languages) => {
	//Your stuff here.
}).catch((ex) => {
	//Handle errors here.
});
````

Both the classes support cache, data caching is provided by the module "tiny-cacher", you can find more information about it on its [repository on GitHub](https://github.com/RyanJ93/tiny-cacher).

If you like this project and think that is useful don't be scared and feel free to contribute reporting bugs, issues or suggestions or if you feel generous, you can send a donation [here](https://www.enricosola.com/about#donations).

Are you looking for the PHP version? Give a look [here](https://github.com/RyanJ93/php-locale-kit).