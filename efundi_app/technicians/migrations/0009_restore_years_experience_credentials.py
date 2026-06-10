from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('technicians', '0008_restore_specialization_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='technician',
            name='years_of_experience',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='technician',
            name='credentials',
            field=models.FileField(blank=True, null=True, upload_to='technician_credentials/'),
        ),
    ]
