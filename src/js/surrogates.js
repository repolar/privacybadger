/*
 * This file is part of Privacy Badger <https://privacybadger.org/>
 * Copyright (C) 2016 Electronic Frontier Foundation
 *
 * Privacy Badger is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Privacy Badger is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Privacy Badger.  If not, see <http://www.gnu.org/licenses/>.
 */

require.scopes.surrogates = (function () {

const db = require('surrogatedb');

const WIDGET_SURROGATES = (function () {
  let memo = {};
  for (let host of Object.keys(db.hostnames)) {
    let widget_name = db.hostnames[host].widget;
    if (widget_name) {
      memo[host] = widget_name;
    }
  }
  return memo;
}());

/**
 * Blocking tracking scripts (trackers) can cause parts of webpages to break.
 * Surrogate scripts are dummy pieces of JavaScript meant to supply just enough
 * of the original tracker's functionality to allow pages to continue working.
 *
 * This method gets called within request-blocking listeners:
 * It needs to be fast!
 *
 * @param {String} script_url The full URL of the script resource being requested.
 *
 * @param {String} script_hostname The hostname component of the script_url
 * parameter. This is an optimization: the calling context should already have
 * this information.
 *
 * @return {(String|Boolean)} Extension URL to the surrogate script
 * when there is a match; boolean false otherwise.
 */
function getSurrogateUri(script_url, script_hostname) {
  // do we have an entry for the script hostname?
  if (!db.hostnames.hasOwnProperty(script_hostname)) {
    return false;
  }

  const conf = db.hostnames[script_hostname];

  switch (conf.match) {

  // wildcard token:
  // matches any script URL for the hostname
  case db.MATCH_ANY: {
    return db.surrogates[conf.token];
  }

  // one or more suffix tokens:
  // does the script URL (querystring excluded) end with one of these tokens?
  case db.MATCH_SUFFIX: {
    const qs_start = script_url.indexOf('?');

    for (const token of conf.tokens) {
      // do any of the suffix tokens match the script URL?
      let match = false;

      if (qs_start == -1) {
        if (script_url.endsWith(token)) {
          match = true;
        }
      } else {
        if (script_url.endsWith(token, qs_start)) {
          match = true;
        }
      }

      // there is a match, return the surrogate code
      if (match) {
        return db.surrogates[token];
      }
    }

    return false;
  }

  // one or more prefix tokens:
  // does the script URL's path component begin with one of these tokens?
  case db.MATCH_PREFIX: {
    let script_path_onwards = script_url.slice(
      script_url.indexOf(script_hostname) + script_hostname.length);
    for (const token of conf.tokens) {
      if (script_path_onwards.startsWith(token)) {
        return db.surrogates[token];
      }
    }

    return false;
  }

  }

  return false;
}

const exports = {
  getSurrogateUri,
  WIDGET_SURROGATES
};

return exports;

}());
