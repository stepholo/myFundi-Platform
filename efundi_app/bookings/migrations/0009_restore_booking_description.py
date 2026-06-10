from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0008_remove_servicepricelist_unique_category_fault_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='description',
            field=models.TextField(blank=True, null=True),
        ),
    ]
