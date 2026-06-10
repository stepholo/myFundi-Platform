from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0004_commission_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='withdrawalrequest',
            name='originator_conversation_id',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='withdrawalrequest',
            name='conversation_id',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AlterField(
            model_name='withdrawalrequest',
            name='status',
            field=models.CharField(
                choices=[
                    ('Pending', 'Pending'),
                    ('Processing', 'Processing'),
                    ('Approved', 'Approved'),
                    ('Rejected', 'Rejected'),
                    ('Failed', 'Failed'),
                ],
                default='Pending',
                max_length=20,
            ),
        ),
    ]
