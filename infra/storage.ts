export const bucket = new sst.aws.Bucket("MediaBucket", {
  public: false,
  cors: [
    {
      allowedHeaders: ["*"],
      allowedMethods: ["GET", "PUT", "POST", "DELETE"],
      allowedOrigins: ["*"], // In production, restrict to your domain
      exposedHeaders: ["ETag"],
    },
  ],
});
