"""Seed the ServicePriceList table from the myfundi payment rate document."""

from django.core.management.base import BaseCommand

from bookings.models import ServicePriceList

# (category, fault_name, bill_min, bill_max, worker_min, worker_max, keeps_min, keeps_max, notes)
SEED_DATA = [
    # ---- Fridge & Refrigerator Repair ----
    ('Fridge Repair', 'Diagnostic / site assessment',     500,    1000,  150,   350,   350,   650,  ''),
    ('Fridge Repair', 'Coil cleaning',                   2000,    5000,  700,  1800,  1300,  3200,  ''),
    ('Fridge Repair', 'Thermostat repair',               3000,    7000, 1000,  2500,  2000,  4500,  ''),
    ('Fridge Repair', 'Door gasket / seal replacement',  2500,    6000,  900,  2200,  1600,  3800,  ''),
    ('Fridge Repair', 'Gas refilling / refrigerant recharge', 3500, 8000, 1200, 2800, 2300, 5200,  ''),
    ('Fridge Repair', 'Refrigerant leak seal + recharge', 5000,  10000, 1800, 3500,  3200,  6500,  ''),
    ('Fridge Repair', 'Relay / overload protector replace', 2000,  5000,  700, 1800,  1300,  3200,  ''),
    ('Fridge Repair', 'Control / PCB board repair',      4000,   10000, 1400, 3500,  2600,  6500,  ''),
    ('Fridge Repair', 'Compressor replacement',         10000,   20000, 3000, 7000,  7000, 13000,  ''),
    ('Fridge Repair', 'Ice maker / freezer section fix', 2000,    8000,  700, 2800,  1300,  5200,  ''),

    # ---- Washing Machine Repair ----
    ('Washing Machine', 'Diagnostic visit',                      500,  1000,   150,   350,   350,   650, ''),
    ('Washing Machine', 'Belt / minor leak',                    2000,  5000,   700,  1800,  1300,  3200, ''),
    ('Washing Machine', 'Door lock / latch replacement',        1500,  4500,   500,  1600,  1000,  2900, ''),
    ('Washing Machine', 'Door seal (drum gasket) replacement',  2500,  6000,   900,  2200,  1600,  3800, ''),
    ('Washing Machine', 'Water pump / drain pump replace',      3500,  8000,  1200,  2800,  2300,  5200, ''),
    ('Washing Machine', 'Thermostat / heating element',         3000,  7000,  1000,  2500,  2000,  4500, ''),
    ('Washing Machine', 'Inlet / solenoid valve replace',       2000,  5000,   700,  1800,  1300,  3200, ''),
    ('Washing Machine', 'Control board / PCB repair',           5000, 15000,  1800,  5250,  3200,  9750, ''),
    ('Washing Machine', 'Motor replacement (full)',              8000, 20000,  2800,  7000,  5200, 13000, ''),
    ('Washing Machine', 'New machine installation',             4500,  4500,  1500,  2000,  2500,  3000, ''),

    # ---- Cooker, Oven & Microwave ----
    ('Cooker & Oven', 'Microwave — general repair',           2500,  6000,   900, 2100,  1600,  3900, ''),
    ('Cooker & Oven', 'Microwave — not heating fix',          3000,  7000,  1050, 2450,  1950,  4550, ''),
    ('Cooker & Oven', 'Electric cooker — minor repair',       1500,  2500,   525,  875,   975,  1625, ''),
    ('Cooker & Oven', 'Electric cooker — heating element',    3000,  5000,  1050, 1750,  1950,  3250, ''),
    ('Cooker & Oven', 'Cooker glass top replacement',         3000,  6000,  1050, 2100,  1950,  3900, ''),
    ('Cooker & Oven', 'Gas cooker — igniter / spark fix',     2000,  4500,   700, 1575,  1300,  2925, ''),
    ('Cooker & Oven', 'Gas cooker — burner replacement',      2000,  5000,   700, 1750,  1300,  3250, ''),
    ('Cooker & Oven', 'Gas cooker — gas leak repair',         3000,  5000,  1050, 1750,  1950,  3250, ''),
    ('Cooker & Oven', 'Dual-fuel cooker — electrical fault',  5000,  8000,  1750, 2800,  3250,  5200, ''),
    ('Cooker & Oven', 'Built-in oven — heating element',      4000,  8000,  1400, 2800,  2600,  5200, ''),
    ('Cooker & Oven', 'Oven — thermostat replacement',        3500,  6000,  1225, 2100,  2275,  3900, ''),
    ('Cooker & Oven', 'Water dispenser — full repair',        2500,  5500,   875, 1925,  1625,  3575, ''),

    # ---- Television & Electronics ----
    ('Television', 'TV diagnostic assessment',            500,  1500,   175,   525,   325,   975, ''),
    ('Television', 'Backlight / LED strip repair',       4000, 12500,  1400,  4375,  2600,  8125, ''),
    ('Television', 'Power supply board repair',          3000,  8500,  1050,  2975,  1950,  5525, ''),
    ('Television', 'Motherboard / main board replace',   5000, 15000,  1750,  5250,  3200,  9750, ''),
    ('Television', 'T-Con board repair',                 4000, 12000,  1400,  4200,  2600,  7800, ''),
    ('Television', 'Audio / speaker fix',                2500,  5000,   875,  1750,  1625,  3250, ''),
    ('Television', 'HDMI / USB port repair',             2000,  4500,   700,  1575,  1300,  2925, ''),
    ('Television', 'Screen / panel replacement',        12000, 50000,  4200, 17500,  7800, 32500, ''),
    ('Television', 'TV wall mounting',                   2000,  5000,   700,  1750,  1300,  3250, ''),
    ('Television', 'Smart TV software / signal fix',     1500,  4000,   525,  1400,   975,  2600, ''),

    # ---- Electrical Installation & Repair ----
    ('Electrical', 'Single socket install / replace',           800,  1500,   300,   600,   500,   900, ''),
    ('Electrical', 'Multiple socket (3–5 points)',             2500,  5000,  1000,  2000,  1500,  3000, ''),
    ('Electrical', 'Switch replacement',                        500,  1200,   200,   500,   300,   700, ''),
    ('Electrical', 'Lighting fitting / bulb install',           500,  2000,   200,   800,   300,  1200, ''),
    ('Electrical', 'Fan installation (ceiling / stand)',       1500,  4000,   600,  1600,   900,  2400, ''),
    ('Electrical', 'Flickering / dead outlet fault',           1500,  4000,   600,  1600,   900,  2400, ''),
    ('Electrical', 'Circuit breaker (MCB) replace',            2000,  5000,   800,  2000,  1200,  3000, ''),
    ('Electrical', 'Distribution board (DB) upgrade',         15000, 50000,  5250, 17500,  9750, 32500, ''),
    ('Electrical', 'Earthing / grounding system',              5000, 15000,  1750,  5250,  3250,  9750, ''),
    ('Electrical', 'House rewiring (1-bed flat)',             15000, 30000,  6000, 10500,  9000, 19500, ''),
    ('Electrical', 'Full house wiring (3-bed new build)',     50000, 85000, 18000, 30000, 32000, 55000, ''),
    ('Electrical', 'Generator / inverter installation',        8000, 25000,  2800,  8750,  5200, 16250, ''),

    # ---- Security Systems ----
    ('Security Systems', 'CCTV — 4-camera home system',            5000, 15000,  1750,  5250,  3250,  9750, ''),
    ('Security Systems', 'CCTV — 8-camera system install',        20000, 40000,  7000, 14000, 13000, 26000, ''),
    ('Security Systems', 'CCTV — camera repair / replace',         2000,  6000,   700,  2100,  1300,  3900, ''),
    ('Security Systems', 'CCTV — DVR/NVR setup & config',          2500,  6000,   875,  2100,  1625,  3900, ''),
    ('Security Systems', 'Burglar alarm system install',           15000, 40000,  5250, 14000,  9750, 26000, ''),
    ('Security Systems', 'Alarm system repair / service',          2000,  8000,   700,  2800,  1300,  5200, ''),
    ('Security Systems', 'Electric fence installation',              850,  1200,   300,   420,   550,   780, 'per metre'),
    ('Security Systems', 'Electric fence repair / fault',          3000,  8000,  1050,  2800,  1950,  5200, ''),
    ('Security Systems', 'Gate automation — sliding gate',        10000, 20000,  3500,  7000,  6500, 13000, ''),
    ('Security Systems', 'Gate automation — swing gate',          15000, 25000,  5250,  8750,  9750, 16250, ''),
    ('Security Systems', 'Intercom system install (home)',         15000, 30000,  5250, 10500,  9750, 19500, ''),
    ('Security Systems', 'Access control / smart lock install',     8000, 25000,  2800,  8750,  5200, 16250, ''),

    # ---- Solar & Backup Power ----
    ('Solar & Power', 'Solar panel install — small system',      10000, 20000,  3500,  7000,  6500, 13000, ''),
    ('Solar & Power', 'Solar panel install — medium (3–5 room)', 25000, 50000,  8750, 17500, 16250, 32500, ''),
    ('Solar & Power', 'Solar water heater install',              20000, 60000,  7000, 21000, 13000, 39000, ''),
    ('Solar & Power', 'Inverter / UPS install',                   8000, 20000,  2800,  7000,  5200, 13000, ''),
    ('Solar & Power', 'Solar system fault / repair',              3000, 10000,  1050,  3500,  1950,  6500, ''),
    ('Solar & Power', 'Electric water heater install',            5000, 15000,  1750,  5250,  3250,  9750, ''),

    # ---- Plumbing — Taps, Pipes & Drains ----
    ('Plumbing', 'Tap leak / washer replace',                    1500,  3000,   600,  1200,   900,  1800, ''),
    ('Plumbing', 'Tap full replacement',                         2000,  5000,   800,  2000,  1200,  3000, ''),
    ('Plumbing', 'Under-sink pipe / waste repair',               2000,  6000,   800,  2400,  1200,  3600, ''),
    ('Plumbing', 'Sink / basin installation',                    4000, 10000,  1600,  4000,  2400,  6000, ''),
    ('Plumbing', 'Blocked drain (kitchen / bathroom)',           2000,  5000,   800,  2000,  1200,  3000, ''),
    ('Plumbing', 'Sewer / main drain blockage',                  5000, 15000,  2000,  6000,  3000,  9000, ''),
    ('Plumbing', 'Fixture leak (toilet / sink)',                  5000, 10000,  2000,  4000,  3000,  6000, ''),
    ('Plumbing', 'Burst pipe repair (accessible)',               8000, 15000,  3200,  6000,  4800,  9000, ''),
    ('Plumbing', 'Pipe installation (new run)',                    300,   800,   100,   320,   200,   480, 'per metre'),
    ('Plumbing', 'Emergency plumbing (24/7)',                    5000, 20000,  2000,  8000,  3000, 12000, ''),
    # Bathroom & Toilet
    ('Plumbing', 'Toilet cistern fix / running toilet',          2000,  5000,   800,  2000,  1200,  3000, ''),
    ('Plumbing', 'Toilet full replacement',                      6000, 15000,  2400,  6000,  3600,  9000, ''),
    ('Plumbing', 'Toilet seat replacement',                      1500,  3500,   600,  1400,   900,  2100, ''),
    ('Plumbing', 'Shower installation (electric)',               5000, 15000,  2000,  6000,  3000,  9000, ''),
    ('Plumbing', 'Shower mixer / valve replace',                 2000,  5000,   800,  2000,  1200,  3000, ''),
    ('Plumbing', 'Shower head replacement',                      1000,  3000,   400,  1200,   600,  1800, ''),
    ('Plumbing', 'Electric / instant shower repair',             2500,  7000,  1000,  2800,  1500,  4200, ''),
    ('Plumbing', 'Low water pressure fix',                       3000, 10000,  1200,  4000,  1800,  6000, ''),
    # Water Tanks, Pumps & Heaters
    ('Plumbing', 'Water tank install (plastic, rooftop)',        8000, 20000,  3200,  8000,  4800, 12000, ''),
    ('Plumbing', 'Booster pump install',                         5000, 15000,  2000,  6000,  3000,  9000, ''),
    ('Plumbing', 'Water pump repair / service',                  3000,  8000,  1200,  3200,  1800,  4800, ''),
    ('Plumbing', 'Geyser / storage water heater install',        8000, 20000,  3200,  8000,  4800, 12000, ''),
    ('Plumbing', 'Water heater repair',                          3000, 10000,  1200,  4000,  1800,  6000, ''),
    ('Plumbing', 'Water tank cleaning',                          3000,  8000,  1200,  3200,  1800,  4800, ''),

    # ---- Small Household Appliances ----
    ('Small Appliances', 'Electric kettle repair',                500,  1500,   175,   700,   325,   975, ''),
    ('Small Appliances', 'Iron box / steam iron repair',          500,  2000,   175,   700,   325,  1300, ''),
    ('Small Appliances', 'Blender / food processor repair',       800,  3000,   280,  1050,   520,  1950, ''),
    ('Small Appliances', 'Toaster repair',                        500,  1500,   175,   525,   325,   975, ''),
    ('Small Appliances', 'Air fryer repair',                     1500,  4000,   525,  1400,   975,  2600, ''),
    ('Small Appliances', 'Tumble dryer repair',                  3500,  7000,  1225,  2450,  2275,  4550, ''),
    ('Small Appliances', 'Dishwasher repair',                    3000,  9000,  1050,  3150,  1950,  5850, ''),
    ('Small Appliances', 'Air conditioner service / repair',     3000,  8000,  1050,  2800,  1950,  5200, ''),

    # ---- Other Technical Services ----
    ('Other Technical', 'DSTV / TV aerial installation',         2000,  5000,   700,  1750,  1300,  3250, ''),
    ('Other Technical', 'DSTV / decoder repair',                 1500,  4000,   525,  1400,   975,  2600, ''),
    ('Other Technical', 'Smart doorbell / video doorbell install', 2000, 5000,  700,  1750,  1300,  3250, ''),
    ('Other Technical', 'Surge protector / voltage stabilizer',  3000,  8000,  1050,  2800,  1950,  5200, ''),
    ('Other Technical', 'Home theatre / soundbar setup',         2000,  6000,   700,  2100,  1300,  3900, ''),
    ('Other Technical', 'WiFi / router / network setup',         2000,  5000,   700,  1750,  1300,  3250, ''),
    ('Other Technical', 'Outdoor lighting / floodlight install', 2000,  5000,   800,  2000,  1200,  3000, ''),
    ('Other Technical', 'Coffee maker / espresso machine repair', 2000, 6000,   700,  2100,  1300,  3900, ''),
]


class Command(BaseCommand):
    help = 'Seed ServicePriceList from the myfundi payment rate document'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all existing prices before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            deleted, _ = ServicePriceList.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'Deleted {deleted} existing entries.'))

        created = updated = 0
        for row in SEED_DATA:
            (
                category, fault_name,
                bill_min, bill_max,
                worker_min, worker_max,
                keeps_min, keeps_max,
                notes,
            ) = row
            _, was_created = ServicePriceList.objects.update_or_create(
                category=category,
                fault_name=fault_name,
                defaults={
                    'company_bill_min': bill_min,
                    'company_bill_max': bill_max,
                    'worker_min': worker_min,
                    'worker_max': worker_max,
                    'company_keeps_min': keeps_min,
                    'company_keeps_max': keeps_max,
                    'notes': notes,
                    'is_active': True,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Done — {created} created, {updated} updated. '
                f'Total: {ServicePriceList.objects.count()} service prices.'
            )
        )
