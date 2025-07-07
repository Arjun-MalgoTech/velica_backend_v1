import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const bucketRegion = process.env.AWS_REGION;
const bucketName = process.env.AWS_S3_BUCKET_NAME;
const s3 = new S3Client({
  region: bucketRegion,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadFile = async (key, fileBuffer, contentType) => {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ACL: "public-read",
      ContentType: contentType,
    });
    await s3.send(command);

    
    const url = `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${key}`;
    return url;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};

export default uploadFile;
