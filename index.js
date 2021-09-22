const core = require('@actions/core');
const github = require('@actions/github');

const main = async () => {
  console.log("Oi");

  const githubToken = core.getInput("token");
  const numberOfReviews = core.getInput("requiredReviews");

  const octokit = github.getOctokit(githubToken);
  const stagePull = github.context.payload.pull_request;
  const repo = stagePull.repo;

  const sourceBranch = stagePull.head.ref;
  const targetBranch = stagePull.base.ref;

  if (targetBranch !== repo.data.default_branch) {
    const pulls = await octokit.rest.pulls.list({
      owner: repo.owner.name,
      repo: repo.name,
      head: stagePull.data.head.ref,
      base: repo.data.default_branch,
    });

    if (pulls.length === 0) {
      const createPrUrl = `https://github.com/${repo.owner.name}/${repo.name}/compare/${repo.data.default_branch}...${sourceBranch}`;
      throw new Error("É necessário criar o PR para o branch "+ repo.data.default_branch +". Acesse: "+ createPrUrl);
    }

    const masterPr = pulls.data[0];
    const masterReviews = await octokit.rest.pulls.listReviews({
      owner: repo.owner.name,
      repo: repo.name,
      pull_number: masterPr.number,
    });

    const reviews = masterReviews.data.filter((review => review.state === "APPROVED"));

    if (reviews.length < numberOfReviews) {
      throw new Error("É necessário solicitar os reviews no PR #"+ masterPr.number +" ("+ masterPr.url +")");
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
