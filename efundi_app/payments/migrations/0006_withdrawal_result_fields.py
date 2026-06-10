from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0005_withdrawal_b2c_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='withdrawalrequest',
            name='result_code',
            field=models.CharField(blank=True, max_length=10),
        ),
        migrations.AddField(
            model_name='withdrawalrequest',
            name='result_description',
            field=models.TextField(blank=True),
        ),
    ]
