
const pull = 'git pull'

const pullForce = 'git checkout . && git pull'

const pullHard = 'git reset --hard && git pull'

const pullClean = 'git clean --xdf && git reset --hard && git pull'

export {
  pull,
  pullForce,
  pullHard,
  pullClean,
}