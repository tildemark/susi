import * as Minio from 'minio';

const minioEndPoint = process.env.MINIO_ENDPOINT || 'localhost';
const minioPort = parseInt(process.env.MINIO_PORT || '9000', 10);
const minioAccessKey = process.env.MINIO_ACCESS_KEY || 'susi_admin';
const minioSecretKey = process.env.MINIO_SECRET_KEY || 'susi_admin_password';
const minioUseSSL = process.env.MINIO_SSL === 'true';

const globalForMinio = globalThis as unknown as { minioClient: Minio.Client | undefined };

export const minioClient =
  globalForMinio.minioClient ??
  new Minio.Client({
    endPoint: minioEndPoint,
    port: minioPort,
    useSSL: minioUseSSL,
    accessKey: minioAccessKey,
    secretKey: minioSecretKey,
  });

if (process.env.NODE_ENV !== 'production') globalForMinio.minioClient = minioClient;
