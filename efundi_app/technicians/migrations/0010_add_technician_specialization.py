from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('technicians', '0009_restore_years_experience_credentials'),
    ]

    operations = [
        migrations.AddField(
            model_name='technicianspecialization',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
    ]
