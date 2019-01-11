(function() {
  'use strict';
  var rp = require('request-promise');
  var debug = require('debug')('pay-wallet:client');

  module.exports = function PayWalletClient(params) {
    var brandId = params.brandId;
    var uri = params.uri;
    var authorizationToken = params.authorizationToken;
    var agentOptions = params.agentOptions;
    var headers = {
      'Content-Type' : 'application/json',
      'Authorization' : 'Bearer ' + authorizationToken
    };

    if(params.headers) { // merge normal headers with extended headers
      var customHeaders = [].slice.call(params.headers, 1);
      customHeaders.forEach(function (source) {
        for(var prop in source) {
          headers[prop] = source[prop];
        }
      });
    }

    function doRestCall(restParams) {
      var rpOptions = {
        method: restParams.method,
        uri: restParams.uri,
        resolveWithFullResponse: restParams.resolveWithFullResponse,
        body: restParams.body,
        json: true,
        timeout: 5000,
        agentOptions: agentOptions,
        headers: headers
      };
      debug('rpOptions: %O', rpOptions);
      return rp(rpOptions);
    }

    function post(endpoint, body) {
      var restParams = {
        uri: uri + endpoint,
        method: 'POST',
        body: body
      };
      debug('restParams: %O', restParams);
      return doRestCall(restParams);
    }

    function get(endpoint, fullResponse) {
      var restParams = {
        uri: uri + endpoint,
        method: 'GET',
        resolveWithFullResponse: fullResponse
      };
      debug('restParams: %O', restParams);
      return doRestCall(restParams);
    }

    function handleResponse(response) {
      debug('handleResponse() response=%O', response);
      return Promise.resolve(response);
    }

    function handleError(err) {
      delete err.response;
      delete err.request;
      debug('handleError() err=%O', err);
      debug('err.statusCode: %s, err.options.uri: %s, err.options.method: %s',
          err.statusCode === 409, err.options.uri.match(/users/g), err.options.method === 'POST');
      if(err.statusCode === 409 &&
          err.options && err.options.uri && err.options.uri.match(/users/g) &&
          err.options && err.options.method && err.options.method === 'POST') {
        return Promise.reject({message: err.message, statusCode: err.statusCode, isRecoverableError: false});
      } else {
        return Promise.reject(err);
      }
    }

    return {
      createUser: function(username, password, passwordConfirmation, brandUuid) {
        var body = {
          username: username,
          password: password,
          passwordConfirmation: passwordConfirmation,
          brandUuid: brandUuid
        };
        return post('/users', body)
          .then(handleResponse)
          .catch(handleError);
      },
      register: function(username, password, passwordConfirmation, wallets, brandUuid) {
        var body = {
          username: username,
          password: password,
          passwordConfirmation: passwordConfirmation,
          wallets: wallets,
          brandUuid: brandUuid
        };
        return post('/register', body)
          .then(handleResponse)
          .catch(handleError);
      },
      login: function(loginParams) {
        var body = {
          provider: loginParams.provider,
          username: loginParams.username,
          password: loginParams.password,
          clientToken: loginParams.clientToken,
          brandUuid: loginParams.brandUuid
        };
        return post('/login', body)
          .then(handleResponse)
          .catch(handleError);
      },
      forgot: function(username, brandUuid) {
        var body = {
          username: username,
          brandUuid: brandUuid
        };
        return post('/forgot', body)
          .then(handleResponse)
          .catch(handleError);
      },
      reset: function(password, passwordConfirmation, resetPasswordToken, brandUuid) {
        var body = {
          password: password,
          passwordConfirmation: passwordConfirmation,
          resetPasswordToken: resetPasswordToken,
          brandUuid: brandUuid
        };

        return post('/reset', body)
          .then(handleResponse)
          .catch(handleError);
      },
      createCreditWallet: function(userUuid, currency) {
        var body = [{
          currency: currency,
          type: 'credit'
        }];
        return post('/users/' + userUuid + '/wallets', body)
          .then(handleResponse)
          .catch(handleError);
      },
      createDebitWallet: function(userUuid, currency) {
        var body = {
          currency: currency,
          type: 'debit'
        };
        return post('/users/' + userUuid + '/wallets', body)
          .then(handleResponse)
          .catch(handleError);
      },
      getOrCreateWalletByCurrency:  function(userUuid, currency) {
        return post('/users/' + userUuid + '/wallet/'+currency, {})
          .then(handleResponse)
          .catch(handleError);
      },
      createWallets: function(userUuid, wallets) {
        return post('/users/' + userUuid + '/wallets', wallets)
          .then(handleResponse)
          .catch(handleError);
      },
      getWallets: function(userUuid) {
        return get('/users/' + userUuid + '/wallets')
          .then(handleResponse)
          .catch(handleError);
      },
      getUserWallet: function(userUuid, walletUuid) {
        return get('/users/' + userUuid + '/wallets/' + walletUuid)
          .then(handleResponse)
          .catch(handleError);
      },
      getUser: function(userUuid) {
        return get('/users/'+userUuid)
          .then(handleResponse)
          .catch(handleError);
      },
      getWallet: function(walletUuid) {
        return get('/wallets/' + walletUuid)
          .then(handleResponse)
          .catch(handleError);
      },
      getTransactions: function() {
        return get('/transactions')
          .then(handleResponse)
          .catch(handleError);
      },
      getWalletTransactions: function(userUuid, walletUuid, page, pageSize, sortDirection, search) {
        let path = '/users/' + userUuid + '/wallets/' + walletUuid + '/transactions';
        path+= page ? (path.indexOf('?') >= 0 ? '&' : '?') + 'page='+page : '';
        path+= pageSize ? (path.indexOf('?') >= 0 ? '&' : '?') + 'pageSize='+pageSize : '';
        path+= sortDirection ? (path.indexOf('?') >= 0 ? '&' : '?') + 'sortDirection='+sortDirection : '';
        path+= search ? (path.indexOf('?') >= 0 ? '&' : '?') + 'search='+search : '';

        return get(path)
          .then(handleResponse)
          .catch(handleError);
      },
      getUserTransactions: function(userUuid, direction) {
        var path = '/users/' + userUuid + '/transactions';
        if(direction === 'incoming' || direction === 'outgoing') {
          path = path + '?direction=' + direction;
        }
        return get(path)
          .then(handleResponse)
          .catch(handleError);
      },
      findOrCreateByUsername: function(username) {
        return post('/users/findByUsername/' + username, {})
          .then(handleResponse)
          .catch(handleError);
      },
      findByUsername: function(username) {
        return get('/users/findByUsername/' + username, {})
          .then(handleResponse)
          .catch(handleError);
      },
      getTransaction: function(transactionUuid) {
        return get('/transactions/' + transactionUuid)
          .then(handleResponse)
          .catch(handleError);
      },
      deposit: function(userUuid, walletUuid, amount, currency, reference, tags, extraData) {
        var body = {
          amount: amount,
          currency: currency,
          reference: reference,
          tags: tags,
          extraData: extraData
        };
        return post('/users/' + userUuid + '/wallets/' + walletUuid + '/deposit', body)
          .then(handleResponse)
          .catch(handleError);
      },
      withdraw: function(userUuid, walletUuid, amount, currency, reference, tags, extraData) {
        var body = {
          amount: amount,
          currency: currency,
          reference: reference,
          tags: tags,
          extraData: extraData
        };
        return post('/users/' + userUuid + '/wallets/' + walletUuid + '/withdraw', body)
          .then(handleResponse)
          .catch(handleError);
      },
      transfer: function(fromUserUuid, fromWalletUuid, toUserUuid, toWalletUuid, amount, currency, reference, tags) {
        var body = {
          amount: amount,
          currency: currency,
          reference: reference,
          tags: tags
        };
        return post('/users/' + fromUserUuid + '/wallets/' + fromWalletUuid + '/transfer/' +
            toUserUuid + '/' + toWalletUuid, body)
          .then(handleResponse)
          .catch(handleError);
      },
      multiWalletTransfer: function(transactions) {
        return post('/multi-wallets-transaction', transactions)
          .then(handleResponse)
          .catch(handleError);
      },
      getHealth: function() {
        return get('/health')
          .then(handleResponse)
          .catch(handleError);
      },
      getSummary: function(summaryOptions) {
        var pathAndQuerystring = '/summary/' + summaryOptions.currency;
        if(summaryOptions.tag) {
          pathAndQuerystring += '?tag=' + summaryOptions.tag;
        }
        if(summaryOptions.toWalletUuid) {
          pathAndQuerystring += (pathAndQuerystring.indexOf('?')>=0 ? '&' : '?') +
            'toWalletUuid=' + summaryOptions.toWalletUuid;
        }
        if(summaryOptions.from) {
          pathAndQuerystring += (pathAndQuerystring.indexOf('?')>=0 ? '&' : '?') +
            'from=' + summaryOptions.from;
        }
        if(summaryOptions.to) {
          pathAndQuerystring += (pathAndQuerystring.indexOf('?')>=0 ? '&' : '?') +
            'to=' + summaryOptions.to;
        }

        return get(pathAndQuerystring)
          .then(handleResponse)
          .catch(handleError);
      },
      getBrand: function(brandUuid) {
        return get('/brands/' + brandUuid)
          .then(handleResponse)
          .catch(handleError);
      },
      postBrand: function(brand) {
        return post('/brands')
          .then(handleResponse)
          .catch(handleError);
      },
    };
  };
}());
