import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'

// 👇 now using your barrel re-exports
import  { http } from './utils/index.js'
// import add, {  subtract, avg, multiply, divide } from './utils/math.js'
import * as mymath from './utils/math.js'

const nums = [1, 2, 3, 4, 5,6,7,8,9,10]

// Build the UI
document.querySelector('#app').innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
      <img src="${javascriptLogo}" class="logo vanilla" alt="JavaScript logo" />
    </a>
    <h1>Hello Vite!</h1>

    <div class="card">
      <button id="counter" type="button"></button>
    </div>

    <div class="card">
      <h2>Math demo</h2>
      <pre id="math-out" style="white-space: pre-wrap; margin: .5rem 0 0;"></pre>
    </div>

    <div class="card">
      <h2>HTTP demo</h2>
      <button id="load-posts" type="button">Load Posts</button>
      <ul id="posts" style="margin-top:.5rem;"></ul>
    </div>

    <p class="read-the-docs">Click on the Vite logo to learn more</p>
  </div>
`

// Counter as before
setupCounter(document.querySelector('#counter'))

// --- Integrations ---
// 1) Math results rendered into the page
const mathOut = document.getElementById('math-out')
mathOut.textContent =
  `subtract(10, 4) = ${mymath.subtract(10, 4)}
add(10, 4) = ${mymath.default(10, 4)}
avg([${nums.join(', ')}]) = ${mymath.avg(nums)}`

// 2) HTTP button that fetches and lists posts
const btn = document.getElementById('load-posts')
const postsEl = document.getElementById('posts')

btn.addEventListener('click', async () => {
  btn.disabled = true
  btn.textContent = 'Loading...'
  postsEl.innerHTML = ''
  try {
    const posts = await http('https://jsonplaceholder.typicode.com/posts?_limit=5')
    posts.forEach(p => {
      const li = document.createElement('li')
      li.innerHTML = `<strong>${p.id}.</strong> ${p.title}`
      postsEl.appendChild(li)
    })
  } catch (err) {
    const li = document.createElement('li')
    li.textContent = `Error: ${err.message}`
    postsEl.appendChild(li)
  } finally {
    btn.disabled = false
    btn.textContent = 'Load Posts'
  }
})
