// Licensed under the Apache License, Version 2.0 (the 'License'); you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations under
// the License.

const test = require('node:test')
const assert = require('node:assert/strict')
const { COUCH_URL, mockAgent, mockPool, JSON_HEADERS } = require('./mock.js')
const Nano = require('..')
const nano = Nano(COUCH_URL)

test('should be able to query a partitioned index - POST /db/_partition/partition/_find - db.partitionedFind', async () => {
  // mocks
  const query = {
    selector: {
      $and: {
        date: {
          $gt: '2018'
        },
        name: 'Susan'
      }
    },
    fields: ['name', 'date', 'orderid']
  }
  const response = {
    docs: [
      { name: 'Susan', date: '2019-01-02', orderid: '4411' },
      { name: 'Susan', date: '2019-01-03', orderid: '8523' }
    ]
  }
  mockPool
    .intercept({
      method: 'post',
      path: '/db/_partition/partition/_find',
      body: JSON.stringify(query)
    })
    .reply(200, response, JSON_HEADERS)

  // test POST /db/_partition/partition/_find
  const db = nano.db.use('db')
  const p = await db.partitionedFind('partition', query)
  assert.deepEqual(p, response)
  mockAgent.assertNoPendingInterceptors()
})

test('should handle 404 - POST /db/_partition/partition/_find - db.partitionedFind', async () => {
  // mocks
  const query = {
    selector: {
      name: 'Susan'
    }
  }
  const response = {
    error: 'not_found',
    reason: 'missing'
  }
  mockPool
    .intercept({
      method: 'post',
      path: '/db/_partition/partition/_find',
      body: JSON.stringify(query)
    })
    .reply(404, response, JSON_HEADERS)

  // test POST /db/_partition/partition/_find
  const db = nano.db.use('db')
  await assert.rejects(db.partitionedFind('partition', query), { message: 'missing' })
  mockAgent.assertNoPendingInterceptors()
})

test('should detect missing query - db.partitionedFind', async () => {
  const db = nano.db.use('db')
  await assert.rejects(db.partitionedFind(), { message: 'Invalid parameters' })
  await assert.rejects(db.partitionedFind('partition', 'susan'), { message: 'Invalid parameters' })
})

test('should detect missing query (callback) - db.partitionedFind', async () => {
  const db = nano.db.use('db')
  await new Promise((resolve, reject) => {
    db.partitionedFind(undefined, '', (err, data) => {
      assert.notEqual(err, null)
      resolve()
    })
  })
})
