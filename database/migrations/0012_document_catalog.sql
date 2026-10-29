INSERT INTO public.document_types (code, name, category)
VALUES
('MANIFEST_FLIGHT', 'Manifest Penerbangan', 'departure'),
('MANIFEST_BUS', 'Manifest Bus', 'departure'),
('MANIFEST_HOTEL', 'Manifest Hotel', 'departure'),
('MANIFEST_VISA', 'Manifest Visa', 'departure'),
('MANIFEST_RETURN', 'Manifest Kepulangan', 'departure'),
('ROOM_LIST_HOTEL', 'Room List Hotel', 'departure'),
('ROOM_LIST_GROUP', 'Room List Rombongan', 'departure'),
('PACKAGE_INFO_UMRAH', 'Paket Info Umrah', 'departure'),
('PACKAGE_INFO_TOUR', 'Paket Info Tour', 'departure'),
('PACKAGE_INFO_BUS', 'Paket Info Transportasi Bus', 'service'),
('PACKAGE_INFO_LA', 'Paket Info Land Arrangement', 'service'),
('LEAVE_LETTER', 'Surat Permohonan Cuti', 'traveler'),
('PASSPORT_RECOMMENDATION', 'Surat Rekomendasi Paspor', 'traveler'),
('VACCINE_RECOMMENDATION', 'Surat Rekomendasi Vaksin', 'traveler'),
('TRAVEL_CERTIFICATE', 'Surat Keterangan Perjalanan', 'traveler'),
('AGENT_ID_CARD', 'Kartu Identitas Agen', 'identity'),
('PARTNER_CERTIFICATE', 'Sertifikat Mitra Travel', 'identity'),
('VENDOR_ID_CARD', 'Identitas Vendor Terafiliasi', 'identity'),
('ITINERARY', 'Itinerary Perjalanan', 'departure')
ON CONFLICT (code) DO NOTHING;