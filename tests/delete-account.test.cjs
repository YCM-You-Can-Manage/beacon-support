const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')
const { runInNewContext } = require('node:vm')

const source = readFileSync(join(__dirname, '../delete-account/delete-account.js'), 'utf8')

function page(fetch) {
  const nodes = new Map()
  const timers = new Set()
  const values = {
    email: 'fixture@example.invalid', password: 'fixture', confirmation: 'DELETE', permanent: 'on',
  }
  function element(id) {
    if (!nodes.has(id)) {
      nodes.set(id, {
        dataset: {}, querySelector: element, checkValidity: () => true,
        removeAttribute() {}, reset() {}, focus() {},
        addEventListener(_event, submit) { this.submit = submit },
      })
    }
    return nodes.get(id)
  }
  runInNewContext(source, {
    document: { querySelector: element },
    window: {
      setTimeout(callback) { timers.add(callback); return callback },
      clearTimeout(callback) { timers.delete(callback) },
    },
    AbortController,
    FormData: class { get(name) { return values[name] } },
    fetch,
  })
  return {
    submit: () => element('#delete-account-form').submit({ preventDefault() {} }),
    expire: () => { for (const timer of timers) timer() },
    button: element('#delete-account-button'),
    status: element('#delete-status'),
    success: element('#delete-success'),
  }
}

const auth = () => Response.json({
  access_token: 'fixture', user: { email: 'fixture@example.invalid' },
})

test('a stalled request expires and restores the submit button', async () => {
  let signal
  const form = page((_url, options) => new Promise((_, reject) => {
    signal = options.signal
    signal?.addEventListener('abort', () => reject(signal.reason))
  }))
  const submitted = form.submit()
  assert.ok(signal)
  assert.equal(form.button.disabled, true)
  form.expire()
  await submitted
  assert.equal(signal.aborted, true)
  assert.equal(form.button.disabled, false)
  assert.equal(form.status.hidden, false)
  assert.match(form.status.textContent, /verification service/i)
})

test('an unconfirmed deletion does not promise that nothing was removed', async () => {
  const form = page(async (url) => url.includes('grant_type=password')
    ? auth()
    : Response.json({ success: false }, { status: 409 }))
  await form.submit()
  assert.equal(form.button.disabled, false)
  assert.equal(form.status.hidden, false)
  assert.match(form.status.textContent, /could not confirm.*deletion/i)
  assert.doesNotMatch(form.status.textContent, /no deletion/i)
})

test('an acknowledged deletion still shows success', async () => {
  const form = page(async (url) => url.includes('grant_type=password')
    ? auth()
    : Response.json({ success: true }))
  await form.submit()
  assert.equal(form.success.hidden, false)
  assert.equal(form.status.hidden, true)
})
