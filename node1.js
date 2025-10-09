// setTimeout(() => console.log("timer"), 10000);
// setImmediate(() => console.log("immediate"));
// process.nextTick(() => console.log("nextTick"));
// Promise.resolve().then(() => console.log("promise"));



const p1 = Promise.resolve("OK");
const p2 = Promise.reject("Fail");
const p3 = new Promise(r => setTimeout(() => r("Late"), 1000));

Promise.allSettled([p1, p2, p3]).then(results => {
  console.log(results);
});
Promise.race([p1, p2, p3]).then(result => {
  console.log(result);
});

Promise.any([p1, p2, p3]).then(result => {
  console.log(result);
});


// Stack -> Microtask -> macrotask

(function demo() {
    const t0 = performance.now();
    const log = (label) =>
        console.log(`${(performance.now() - t0).toFixed(1)}ms → ${label}`);

    const p1 = Promise.resolve("OK");
    const p2 = Promise.reject("Fail");
    const p3 = new Promise(r => setTimeout(() => r("Late"), 500));

    // Observe individual promises
    p1.then(v => log(`p1 fulfilled (${v})`));
    p2.catch(e => log(`p2 rejected (${e})`));
    p3.then(v => log(`p3 fulfilled (${v})`));

    // Observe combinators
    Promise.allSettled([p1, p2, p3]).then(res => log(
        `allSettled: ${JSON.stringify(res.map(x => x.status))}`
    ));

    Promise.race([p1, p3]).then(v => log(`race resolved (${v})`))
        .catch(e => log(`race rejected (${e})`));

    Promise.any([p2, p3]).then(v => log(`any fulfilled (${v})`))
        .catch(e => log(`any AggregateError (${e.errors})`));
})();
