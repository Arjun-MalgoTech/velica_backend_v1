
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
    return `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${key}`;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};

export const uploadFiles = async (files) => {
  const uploadedImageUrls = [];

  for (const file of files) {
    const imageUrl = await uploadFile(file.name, file.data, file.mimetype);
    uploadedImageUrls.push(imageUrl);
  }

  return uploadedImageUrls;
};

export default uploadFile;


export const multipleImageUpload = async (files) => {
  if (!Array.isArray(files)) {
    files = [files];
  }
  try {
    const uploadPromises = files.map((file) => {
   
      const key =
        file.key || `${Date.now()}-${file.name}`;
      const fileBuffer = file.data || file.fileBuffer;
      const contentType = file.mimetype || file.contentType;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ACL: "public-read",
        ContentType: contentType,
      });

      return s3.send(command).then(() => 
        `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${key}`
      );
    });
    
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};