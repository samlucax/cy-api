/// <reference types="cypress" />

import {Filters} from './src/Filters'
const React = require('react')
const ReactDOM = require('react-dom')

// shortcuts to a few Lodash methods
const {get, filter, map, uniq} = Cypress._

Cypress.Commands.add('api', (options, name) => {
  const doc = cy.state('document')
  const container = doc.querySelector('.container')
  const messagesEndpoint = Cypress._.get(
    Cypress.env(),
    'cyApi.messages',
    '/__messages__'
  )

  // first reset any messages on the server
  // TODO: handle errors
  cy.request({
    method: 'POST',
    url: messagesEndpoint,
    log: false
  })

  // should we log the message before a request
  // in case it fails?
  Cypress.log({
    name: name || 'api',
    message: options.url,
    consoleProps () {
      return {
        request: options
      }
    }
  })
  container.innerHTML =
    '<div style="text-align: left">\n' +
    '<b>Request:</b>\n' +
    '<pre>' +
    JSON.stringify(options, null, 2) +
    '\n</pre></div>'

  cy.request({
    ...options,
    log: false
  }).then(({ duration, body, status, headers, requestHeaders, statusText }) => {
    // TODO: handle errors
    cy.request({
      url: messagesEndpoint,
      log: false
    }).then(res => {
      const messages = get(res, 'body.messages', [])
      if (messages.length) {
        const types = uniq(map(messages, 'type')).sort()
        // types will be like
        // ['console', 'debug', 'util.debuglog']
        const namespaces = types.map(type => {
          return {
            type,
            namespaces: uniq(map(filter(messages, {type}), 'namespace')).sort()
          }
        })
        // namespaces will be like
        // [
        //  {type: 'console', namespaces: ['log']},
        //  {type: 'util.debuglog', namespaces: ['HTTP']}
        // ]

        container.innerHTML +=
          '<hr>\n' +
          '<div style="text-align: left">\n' +
          `<b>Server logs</b>\n<div id="filters"></div>\n`

        if (types.length) {
          // container.innerHTML += `
          //   <script crossorigin src="https://unpkg.com/react@16/umd/react.development.js"></script>
          //   <script crossorigin src="https://unpkg.com/react-dom@16/umd/react-dom.development.js"></script>
          // `
          // container.innerHTML +=
          //   types.map(type => `\n<input type="checkbox" name="${type}" value="${type}"> ${type}`).join('')
          //   + '<br/>\n'
          // const filtersEl = doc.getElementById('filters')
          // const filterComponent = <div>{
          //   types.map(type =>
          //     <LogTypeFilter checked={false} label={type} key={type}
          //       onChange={} />
          //   )
          // }
          // </div>
          // trying to start live React component in the
          // application under test
          // using https://glebbahmutov.com/blog/cypress-jump/
          // ReactDOM.render(<Filters types={types} />, filtersEl)
          // const onChange = () => {
          //   console.log('changing')
          //   debugger
          // }

          // container.innerHTML = `
          //   <div>
          //     <label>
          //       <input id="filter" type="checkbox" checked="true" value="console" name="console" />
          //     </label>
          //     <span> Console</span>
          //   </div>
          // `
          // const filterEl = doc.getElementById('filter')
          // // hmm, cannot attach event listeners - seems their are disabled
          // // by the test runner?
          // filterEl.addEventListener('change', onChange)
        }
        // if (namespaces.length) {
        //   container.innerHTML += '\n'
        //     + namespaces.map(n => {
        //       if (!n.namespaces.length) {
        //         return ''
        //       }
        //       return n.namespaces.map(namespace => {
        //         return `\n<input type="checkbox" name="${n.type}.${namespace}"
        //           value="${n.type}.${namespace}"> ${n.type}.${namespace}`
        //       }).join('')
        //     }).join('') + '<br/>\n'
        // }

        container.innerHTML +=
          '\n<pre style="text-align: left">' +
          messages.map(m => `${m.type} ${m.namespace}: ${m.message}`).join('<br/>') +
          '\n</pre></div>'
      }

      // render the response object
      // TODO render headers?
      container.innerHTML +=
        '<hr>\n' +
        '<div style="text-align: left">\n' +
        `<b>Response: ${status} ${duration}ms</b>\n` +
        '<pre>' +
        JSON.stringify(body, null, 2) +
        '\n</pre></div>'

      // log the response
      Cypress.log({
        name: 'response',
        message: options.url,
        consoleProps () {
          return {
            type: typeof body,
            response: body
          }
        }
      })

      return {
        messages,
        // original response information
        duration,
        body,
        status,
        statusText,
        headers,
        requestHeaders
      }
    })
  })
})
