import express from 'express';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Example schema with Zod for type-safe validation
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
});

type User = z.infer<typeof UserSchema>;

// User type is used for type safety in validation

// Swagger stats
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'ERP Backend API',
    version: '1.0.0',
    description: 'RESTful API for ERP System',
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'Development server',
    },
  ],
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Test routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// Test JWT functionality
app.post('/api/auth/token', (_req: Request, res: Response) => {
  const token = jwt.sign(
    { userId: '123', email: 'test@example.com' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '7d' }
  );
  res.json({ token });
});

// Test Bcrypt functionality
app.post('/api/auth/hash', async (_req: Request, res: Response) => {
  const password = 'TestPassword123!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const isMatch = await bcrypt.compare(password, hash);
  res.json({ hash, isMatch });
});

// Test Zod validation
app.post('/api/validate/user', (_req: Request, res: Response) => {
  try {
    const data: User = {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      email: 'user@example.com',
      name: 'John Doe',
      password: 'SecurePassword123!',
    };
    const validated = UserSchema.parse(data);
    res.json({ success: true, data: validated });
  } catch (error) {
    res.status(400).json({ success: false, error: String(error) });
  }
});;

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ API Docs available on http://localhost:${PORT}/api-docs`);
  console.log(`✓ Node.js version: ${process.version}`);
  console.log('');
  console.log('Installed libraries:');
  console.log('✓ Express.js: ^4.18.2');
  console.log('✓ TypeScript: ^5.3.3');
  console.log('✓ Zod: ^3.22.4');
  console.log('✓ Prisma: ^5.8.0');
  console.log('✓ jsonwebtoken: ^9.0.3');
  console.log('✓ bcrypt: ^5.1.1');
  console.log('✓ swagger-ui-express: ^5.0.0');
});
