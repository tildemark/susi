import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { UnitStatus } from '@prisma/client';

export async function ingestCsvDataAction(formData: FormData) {
  'use server';

  const roomsCsvFile = formData.get('roomsCsv') as File | null;
  const tenantsCsvFile = formData.get('tenantsCsv') as File | null;

  let spacesAdded = 0;
  let tenantsAdded = 0;
  const errors: string[] = [];

  // 1. Process Rooms/Spaces CSV
  if (roomsCsvFile && roomsCsvFile.size > 0) {
    try {
      const text = await roomsCsvFile.text();
      const lines = text.split(/\r?\n/);
      // Expected Headers: RoomNumber,MonthlyRate,WaterMeter,ElectroMeter
      const headers = lines[0].split(',');

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const columns = line.split(',');
        if (columns.length < 4) continue;

        const roomNumber = columns[0].trim();
        const monthlyRate = parseFloat(columns[1]);
        const waterMeter = parseFloat(columns[2]);
        const electroMeter = parseFloat(columns[3]);

        if (!roomNumber || isNaN(monthlyRate) || isNaN(waterMeter) || isNaN(electroMeter)) {
          errors.push(`Row ${i} (Spaces): Invalid format for Room #${roomNumber || i}`);
          continue;
        }

        await db.unit.upsert({
          where: { roomNumber },
          create: {
            roomNumber,
            monthlyRate,
            waterMeter,
            electroMeter,
            status: UnitStatus.VACANT,
          },
          update: {
            monthlyRate,
            waterMeter,
            electroMeter,
          },
        });
        spacesAdded++;
      }
    } catch (e: any) {
      errors.push(`Spaces Ingest Error: ${e.message}`);
    }
  }

  // 2. Process Tenants CSV
  if (tenantsCsvFile && tenantsCsvFile.size > 0) {
    try {
      const text = await tenantsCsvFile.text();
      const lines = text.split(/\r?\n/);
      // Expected Headers: FirstName,LastName,Email,Phone,RoomNumber
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const columns = line.split(',');
        if (columns.length < 5) continue;

        const firstName = columns[0].trim();
        const lastName = columns[1].trim();
        const email = columns[2].trim();
        const phone = columns[3].trim();
        const roomNumber = columns[4].trim();

        if (!firstName || !lastName || !email || !phone || !roomNumber) {
          errors.push(`Row ${i} (Tenants): All fields (First Name, Last Name, Email, Phone, Room Number) are required`);
          continue;
        }

        // Find unit
        const unit = await db.unit.findUnique({
          where: { roomNumber },
        });

        if (!unit) {
          errors.push(`Row ${i} (Tenants): Room #${roomNumber} does not exist in inventory spaces. Ingest spaces first.`);
          continue;
        }

        // Create or update Tenant
        const tenant = await db.tenant.upsert({
          where: { email },
          create: {
            firstName,
            lastName,
            email,
            phone,
            status: 'ACTIVE',
            leaseStartDate: new Date(),
            unitId: unit.id,
          },
          update: {
            firstName,
            lastName,
            phone,
            status: 'ACTIVE',
            unitId: unit.id,
          },
        });

        // Auto-link active lease and flag unit OCCUPIED
        await db.unit.update({
          where: { id: unit.id },
          data: { status: UnitStatus.OCCUPIED },
        });

        // Ensure active lease exists
        const existingLease = await db.lease.findFirst({
          where: { tenantId: tenant.id, status: 'ACTIVE' },
        });

        if (!existingLease) {
          await db.lease.create({
            data: {
              tenantId: tenant.id,
              unitId: unit.id,
              monthlyRate: unit.monthlyRate,
              securityDeposit: unit.monthlyRate * 2,
              advancePaid: unit.monthlyRate,
              advanceConsumed: true,
              advanceApplied: false,
              billingCycle: 'MONTHSARY',
              leaseStartDate: new Date(),
              status: 'ACTIVE',
              waterMeterBaseline: unit.waterMeter,
              elecMeterBaseline: unit.electroMeter,
            },
          });
        }

        tenantsAdded++;
      }
    } catch (e: any) {
      errors.push(`Tenants Ingest Error: ${e.message}`);
    }
  }

  revalidatePath('/settings');
  revalidatePath('/billing');
  revalidatePath('/units');
  revalidatePath('/tenants');
  
  const errMsg = errors.length > 0 ? `&error=${encodeURIComponent(errors.join('; '))}` : '';
  redirect(`/settings?success=CSV Ingest completed: ${spacesAdded} spaces and ${tenantsAdded} tenants processed.${errMsg}&tab=sandbox`);
}
