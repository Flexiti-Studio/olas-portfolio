const fs = require('fs');
const content = `
// -----------------------------------------------------------------------------
// VIDEO TEMPLATES (SCENEWORK)
// -----------------------------------------------------------------------------

model VideoTemplate {
  id          String   @id @default(cuid())
  userId      String?
  name        String
  description String?  @db.Text
  isDefault   Boolean  @default(false)
  version     Int      @default(1)
  data        Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("video_templates")
}
`;
fs.appendFileSync('prisma/schema.prisma', content);
