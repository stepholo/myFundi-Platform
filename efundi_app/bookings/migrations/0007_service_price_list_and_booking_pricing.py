"""Add ServicePriceList table and pricing fields to Booking."""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0006_increase_coordinate_precision'),
    ]

    operations = [
        migrations.CreateModel(
            name='ServicePriceList',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('category', models.CharField(
                    choices=[
                        ('Fridge Repair', 'Fridge & Refrigerator Repair'),
                        ('Washing Machine', 'Washing Machine Repair'),
                        ('Cooker & Oven', 'Cooker, Oven & Microwave'),
                        ('Television', 'Television & Electronics'),
                        ('Electrical', 'Electrical Installation & Repair'),
                        ('Security Systems', 'Security Systems'),
                        ('Solar & Power', 'Solar & Backup Power'),
                        ('Plumbing', 'Plumbing, Bathroom & Water'),
                        ('Small Appliances', 'Small Household Appliances'),
                        ('Other Technical', 'Other Technical Services'),
                        ('Carpentry', 'Carpentry'),
                        ('Cleaning', 'Cleaning'),
                    ],
                    db_index=True,
                    max_length=60,
                )),
                ('fault_name', models.CharField(max_length=120)),
                ('company_bill_min', models.DecimalField(decimal_places=2, max_digits=10)),
                ('company_bill_max', models.DecimalField(decimal_places=2, max_digits=10)),
                ('worker_min', models.DecimalField(decimal_places=2, max_digits=10)),
                ('worker_max', models.DecimalField(decimal_places=2, max_digits=10)),
                ('company_keeps_min', models.DecimalField(decimal_places=2, max_digits=10)),
                ('company_keeps_max', models.DecimalField(decimal_places=2, max_digits=10)),
                ('notes', models.CharField(blank=True, max_length=100)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Service Price',
                'verbose_name_plural': 'Service Prices',
                'ordering': ['category', 'fault_name'],
                'db_table': 'efundi_service_prices',
            },
        ),
        migrations.AddConstraint(
            model_name='servicepricelist',
            constraint=models.UniqueConstraint(
                fields=['category', 'fault_name'],
                name='unique_category_fault',
            ),
        ),
        migrations.AddIndex(
            model_name='servicepricelist',
            index=models.Index(
                fields=['category', 'is_active'],
                name='spl_category_active_idx',
            ),
        ),
        # Expand service_category max_length to accommodate new category names
        migrations.AlterField(
            model_name='booking',
            name='service_category',
            field=models.CharField(
                choices=[
                    ('Plumbing', 'Plumbing, Bathroom & Water'),
                    ('Electrical', 'Electrical Installation & Repair'),
                    ('Fridge Repair', 'Fridge & Refrigerator Repair'),
                    ('Washing Machine', 'Washing Machine Repair'),
                    ('Cooker & Oven', 'Cooker, Oven & Microwave'),
                    ('Television', 'Television & Electronics'),
                    ('Security Systems', 'Security Systems'),
                    ('Solar & Power', 'Solar & Backup Power'),
                    ('Small Appliances', 'Small Household Appliances'),
                    ('Other Technical', 'Other Technical Services'),
                    ('Carpentry', 'Carpentry'),
                    ('Cleaning', 'Cleaning'),
                    ('Other', 'Other'),
                ],
                max_length=60,
            ),
        ),
        # Add pricing fields to Booking
        migrations.AddField(
            model_name='booking',
            name='service_fault',
            field=models.ForeignKey(
                blank=True,
                help_text='Specific service/fault chosen from the price list.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='bookings',
                to='bookings.servicepricelist',
            ),
        ),
        migrations.AddField(
            model_name='booking',
            name='worker_amount',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                default=None,
                help_text='Technician earnings — what the worker receives.',
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='booking',
            name='company_keeps',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                default=None,
                help_text='eFundi platform share (company bill minus worker amount).',
                max_digits=10,
                null=True,
            ),
        ),
    ]
