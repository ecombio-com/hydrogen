(function () {
  var s = document.currentScript;
  var storefront = s.getAttribute('data-storefront');
  var api = s.getAttribute('data-api') || new URL(s.src).origin;
  window.CentralCheckout = {
    start: function (opts) {
      return fetch(api + '/api/checkout/sessions', {
        method: 'POST',
        headers: {'Content-Type': 'text/plain'},
        body: JSON.stringify({
          storefront: storefront,
          lines: opts.lines,
          discountCodes: opts.discountCodes || [],
          email: opts.email,
        }),
      })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error); return j; }); })
        .then(function (session) {
          if (!opts.noRedirect && session.next.type === 'redirect') window.location.href = session.next.url;
          return session;
        });
    },
  };
})();
