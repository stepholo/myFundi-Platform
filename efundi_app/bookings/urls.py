"""URL configuration for the bookings app."""

from django.urls import path

from .views import BookingViewSet, ServicePriceListViewSet, TechnicianLocationViewSet

_booking = BookingViewSet.as_view
_location = TechnicianLocationViewSet.as_view
_pricing = ServicePriceListViewSet.as_view

urlpatterns = [
    # Service price list — used for booking dropdowns and quotations
    path('services/', _pricing({'get': 'list'}), name='service-price-list'),
    path('services/<int:pk>/', _pricing({'get': 'retrieve'}), name='service-price-detail'),

    # Booking CRUD
    path('', _booking({'get': 'list', 'post': 'create'}), name='booking-list'),
    path('<uuid:pk>/', _booking({
        'get': 'retrieve', 'put': 'update',
        'patch': 'partial_update', 'delete': 'destroy',
    }), name='booking-detail'),

    # Dispatch actions
    path('<uuid:pk>/accept/', _booking({'patch': 'accept'}), name='booking-accept'),
    path('<uuid:pk>/decline/', _booking({'patch': 'decline'}), name='booking-decline'),
    path('<uuid:pk>/broadcasts/', _booking({'get': 'broadcasts'}), name='booking-broadcasts'),

    # Public payment endpoints — no auth required (booking UUID is the token)
    path('<uuid:pk>/payment-info/', _booking({'get': 'payment_info'}), name='booking-payment-info'),
    path('<uuid:pk>/pay/', _booking({'post': 'pay'}), name='booking-pay'),

    # Status progression actions
    path('<uuid:pk>/reject/', _booking({'patch': 'reject'}), name='booking-reject'),
    path('<uuid:pk>/start/', _booking({'patch': 'start'}), name='booking-start'),
    path('<uuid:pk>/complete/', _booking({'patch': 'complete'}), name='booking-complete'),
    path('<uuid:pk>/cancel/', _booking({'patch': 'cancel'}), name='booking-cancel'),

    # Technician locations
    path('technician-locations/', _location({'get': 'list', 'post': 'create'}), name='technician-location-list'),
    path('technician-locations/me/', _location({'get': 'update_my_location'}), name='technician-location-me'),
    path('technician-locations/nearby/', _location({'get': 'nearby'}), name='technician-location-nearby'),
    path('technician-locations/<uuid:technician_id>/', _location({
        'get': 'retrieve', 'put': 'update',
        'patch': 'partial_update', 'delete': 'destroy',
    }), name='technician-location-detail'),
]
