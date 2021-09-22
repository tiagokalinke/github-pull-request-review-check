const core = require('@actions/core');
const github = require('@actions/github');

const main = async () => {
  const githubToken = core.getInput("token");
  const numberOfReviews = core.getInput("requiredReviews");

  const octokit = github.getOctokit(githubToken);
  const stagePull = github.context.payload.pull_request;
  const repo = stagePull.head.repo;

  const sourceBranch = stagePull.head.ref;
  const targetBranch = stagePull.base.ref;

  if (targetBranch !== repo.default_branch) {
    const pulls = await octokit.rest.pulls.list({
      owner: repo.owner.login,
      repo: repo.name,
      head: stagePull.head.ref,
      base: repo.default_branch,
    });

    if (pulls.length === 0) {
      const createPrUrl = `https://github.com/${repo.owner.login}/${repo.name}/compare/${repo.default_branch}...${sourceBranch}`;
      throw new Error("É necessário criar o PR para o branch "+ repo.default_branch +". Acesse: "+ createPrUrl);
    }

    const masterPr = pulls.data[0];
    const masterReviews = await octokit.rest.pulls.listReviews({
      owner: repo.owner.login,
      repo: repo.name,
      pull_number: masterPr.number,
    });

    const reviews = masterReviews.data.filter((review => review.state === "APPROVED"));

    if (reviews.length === 0) {
      throw new Error("É necessário solicitar os reviews no PR #"+ masterPr.number +" ("+ masterPr.html_url +")");
    }

    if (reviews.length < numberOfReviews) {
      throw new Error("É necessário solicitar +"+ (numberOfReviews - reviews.length) +" os reviews no PR #"+ masterPr.number +" ("+ masterPr.html_url +")");
    }
  }

  return true;
}

main()
  .then(() => {
    core.info(`Sucesso 🎉`);
  })
  .catch(error => {
    core.error(error);
    core.setFailed(error.message);

    process.exit(1);
  });
