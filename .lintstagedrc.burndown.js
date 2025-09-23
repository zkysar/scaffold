module.exports = {
  "*.ts": [
    "eslint --fix --max-warnings 0 --config .eslintrc.burndown.js",
    "prettier --write"
  ]
};