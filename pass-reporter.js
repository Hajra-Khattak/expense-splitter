// Streams a coloured PASS / FAIL / SKIP badge for each test as it finishes.
const c = {
  pass: '\x1b[42m\x1b[30m PASS \x1b[0m', // green background, black text
  fail: '\x1b[41m\x1b[97m FAIL \x1b[0m', // red background, white text
  skip: '\x1b[43m\x1b[30m SKIP \x1b[0m', // yellow background, black text
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
}

export default class PassReporter {
  constructor() {
    this.passed = 0
    this.failed = 0
    this.skipped = 0
    this.lastModule = null
    this.lastSuites = []
  }

  onTestCaseResult(testCase) {
    const modId = testCase.module.relativeModuleId
    if (modId !== this.lastModule) {
      console.log(`\n${modId}`)
      this.lastModule = modId
      this.lastSuites = []
    }

    // fullName looks like "suite > test", so everything before the last part is the suite path
    const parts = testCase.fullName.split(' > ')
    const suites = parts.slice(0, -1)

    suites.forEach((name, i) => {
      if (this.lastSuites[i] !== name) {
        console.log(`${'  '.repeat(i + 1)}${name}`)
      }
    })
    this.lastSuites = suites

    const result = testCase.result()
    const ms = Math.round(testCase.diagnostic()?.duration ?? 0)
    const pad = '  '.repeat(suites.length + 1)

    let badge = c.skip
    if (result.state === 'passed') {
      this.passed++
      badge = c.pass
    } else if (result.state === 'failed') {
      this.failed++
      badge = c.fail
    } else {
      this.skipped++
    }

    console.log(`${pad}${badge} ${testCase.name} ${c.dim(`${ms}ms`)}`)

    if (result.state === 'failed') {
      for (const err of result.errors ?? []) {
        console.log(`${pad}  ${err.message}`)
      }
    }
  }

  onTestRunEnd() {
    console.log(
      `\n${c.pass} ${this.passed}   ${c.fail} ${this.failed}   ${c.skip} ${this.skipped}\n`
    )
  }
}