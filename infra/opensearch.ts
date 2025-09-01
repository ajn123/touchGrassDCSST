const search =
  $app.stage === "production"
    ? sst.aws.OpenSearch.get("MySearch", "alex-mysearchdomain-wnbdnmcc")
    : new sst.aws.OpenSearch("MySearch");

export { search };
