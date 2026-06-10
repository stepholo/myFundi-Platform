from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('technicians', '0007_remove_skills_credentials_from_technician'),
    ]

    operations = [
        migrations.AddField(
            model_name='technician',
            name='specialization',
            field=models.CharField(default='', max_length=100),
            preserve_default=False,
        ),
    ]
