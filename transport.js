;(function(window, document, $) {
	/**
	 * [ Registers a prefilter with jQuery's ajax object; If a request is cross domain and is IE<10 (!IE<7) it sets the request as iframe]
	 * @param  {object} options - jQuery $.ajax options
	 * @param  {object} originalOptions - jQuery $.ajax options before the request was treated by jQuery
	 * @param  {object} jqXHR - jQuery $.ajax XMLHttpRequest object modified by jQuery
	 * @return {string} returning a string to a prefilter designates this request to a specific type
	 */

	$.ajaxPrefilter(function(options) {
		options.converters[ "json iframe" ] = $.parseJSON; // move to inside the if soon
		if(options.crossDomain && typeof XDomainRequest != 'undefined') {
			return 'iframe';
		}
	});
	/**
	 * Registers a new transport with jQuery, for anything of the dataType 'iframe'
	 * The identification of a dataType as iframe is defined in the prefilter
	 * @param  {Object} options - The $.ajax options
	 * @method send - Called by $.ajax automatically when using the transport expects a call to callback when done
	 * @method abort - Called by $.ajax automatically when call should be aborted
	 * @return callback - Returns StatusCode, StatusText and data to be processed as json
	 */
	$.ajaxTransport('iframe', function( options ) {
		return {
			send: function( headers, callback ) {
				options.dataType = 'json'; // changing datatype so there's no loop
				var txp = new Transport(options.target, JSON.stringify(options));
				txp.done(function(data) {
					txp = null;
					callback(200, 'success', { json: data });
				}).fail(function(data) {
					txp = null;
					callback(404, 'failed', { json: data });
				});
			},
			abort: function() {
				txp = null;
			}
		};
	});

	/**
	 * Transport is a object that takes over communication with the backend for IE8/9 CORS
	 * @type {Function}
	 * @method Constructor - accepts a url, a method and a payload; gets autoloaded from jQuery $.ajax Transport
	 * @returns {@chainable} [a promise object for the transport]
	 */
	function Transport( target, payload ) {
		var $self = this; // self reference

		var defaults = {
			mmdb: memFragConfig.mmdbHost + '/cors_handler/'
		};
		var url = (defaults[target])?defaults[target]:console.log('error'); // whitelist
		var iframeElement = createIframe();
		var frame = iframeElement[0].contentWindow;
		var hash = iframeElement.data('tag'); //might get used later
		if (window.addEventListener) {
			addEventListener("message", msgHandler, false);
		} else {
			attachEvent("onmessage", msgHandler);
		}

		// Create Deferred Promise Object
		this.dfd = new $.Deferred();
		return this.dfd.promise();

		/**
		 * Creates an iframe element through which communication is done
		 * @return Object - returns a jQuery element object referencing the iframe
		 */
		function createIframe() {
			tmp = $('<iframe />', {'src':url, 'name':'cors_iframe','style':'display:none; visibility: hidden;','data-tag': new Date().getTime() });
			$('body').append(tmp);
			return tmp;
		}
		/**
		 * Handles each message received by parent
		 * @event if the message contains the string 'ready', the iframe is ready
		 * @event if the message contains an error object, the deferred will be rejected
		 * @event if the message contains a different string, the deferred will be resolved
		 * @event after completion, the msgHandler will kill() the transport object 
		 * @param  {Object} event [The postMessage event object]
		 * @return nothing
		 */
		function msgHandler(event) {
			if(event.data === 'ready') {
				msgPost();
			}
			else {
				data = JSON.parse(event.data);
				if(data.error) {
					$self.dfd.reject(event.data);
				}
				else {
					$self.dfd.resolve(event.data);
				}
				kill();
			}
		}
		/**
		 * After creating the transport object in the constructor this function
		 * sends a message to the attached iframe
		 * @return nothing
		 */
		function msgPost() {
			frame.postMessage(payload, url);
		}
		/**
		 * Kills the transport object instance by setting it to null and removing iframe
		 * @return nothing
		 */
		function kill() {
			if (window.removeEventListener) {
				removeEventListener("message", msgHandler, false);
			} else {
				detachEvent("onmessage", msgHandler);
			}
			iframeElement.remove();
			$self.dfd = null;
		}
	}

})(window, document, memFrag.$);
