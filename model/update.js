
const pull = 'git pull'

const pullForce = 'git checkout . && git pull'

const pullHard = 'git reset --hard && git pull'

const pullClean = 'git fetch --all && git reset --hard origin/master && git pull'

export {
  pull,
  pullForce,
  pullHard,
  pullClean,
}