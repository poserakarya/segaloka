import 'package:flutter/material.dart';

void main() {
  runApp(const SegalokaApp());
}

class SegalokaApp extends StatelessWidget {
  const SegalokaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Segaloka',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1769AA)),
        scaffoldBackgroundColor: const Color(0xFFF7F9FC),
      ),
      home: const SegalokaHome(),
    );
  }
}

class SegalokaHome extends StatefulWidget {
  const SegalokaHome({super.key});

  @override
  State<SegalokaHome> createState() => _SegalokaHomeState();
}

class _SegalokaHomeState extends State<SegalokaHome> {
  int selectedTab = 0;

  static const categories = <(String, IconData)>[
    ('Umrah', Icons.mosque_outlined),
    ('Haji', Icons.account_balance_outlined),
    ('Halal Tour', Icons.public),
    ('Domestik', Icons.landscape_outlined),
    ('Internasional', Icons.flight_takeoff),
    ('Visa', Icons.badge_outlined),
    ('Akomodasi', Icons.hotel_outlined),
    ('SegaDeals', Icons.local_offer_outlined),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: const Text(
          'segaloka',
          style: TextStyle(
            fontWeight: FontWeight.w800,
            color: Color(0xFF1769AA),
            letterSpacing: -0.6,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Bahasa dan mata uang',
            onPressed: () => showModalBottomSheet<void>(
              context: context,
              showDragHandle: true,
              builder: (context) => const Padding(
                padding: EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pengaturan',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 16),
                    ListTile(
                      leading: Icon(Icons.language),
                      title: Text('Bahasa'),
                      subtitle: Text('Indonesia'),
                    ),
                    ListTile(
                      leading: Icon(Icons.currency_exchange),
                      title: Text('Mata uang'),
                      subtitle: Text('IDR'),
                    ),
                  ],
                ),
              ),
            ),
            icon: const Icon(Icons.language),
          ),
        ],
      ),
      body: IndexedStack(
        index: selectedTab,
        children: [
          _homeContent(),
          _placeholder('Jelajahi', Icons.explore_outlined),
          _placeholder('Pesanan', Icons.receipt_long_outlined),
          _placeholder('Akun', Icons.person_outline),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedTab,
        onDestinationSelected: (index) {
          setState(() => selectedTab = index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Beranda',
          ),
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            label: 'Jelajahi',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            label: 'Pesanan',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'Akun',
          ),
        ],
      ),
    );
  }

  Widget _homeContent() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1769AA), Color(0xFF0C3D74)],
            ),
            borderRadius: BorderRadius.circular(24),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Satu Klik Untuk Semua',
                style: TextStyle(
                  fontSize: 25,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              SizedBox(height: 8),
              Text(
                'Temukan perjalanan dan layanan yang sesuai kebutuhan Anda.',
                style: TextStyle(color: Colors.white, fontSize: 14),
              ),
              SizedBox(height: 22),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.all(Radius.circular(14)),
                ),
                child: Padding(
                  padding: EdgeInsets.all(15),
                  child: Row(
                    children: [
                      Icon(Icons.search, color: Color(0xFF1769AA)),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Cari paket, destinasi, atau layanan',
                          style: TextStyle(color: Colors.black54),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        const Text(
          'Jelajahi Layanan',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 18),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: categories.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            crossAxisSpacing: 8,
            mainAxisSpacing: 12,
            childAspectRatio: 0.85,
          ),
          itemBuilder: (context, index) {
            final category = categories[index];

            return Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircleAvatar(
                  radius: 25,
                  backgroundColor: const Color(0xFFE4F0FA),
                  child: Icon(category.$2, color: const Color(0xFF1769AA)),
                ),
                const SizedBox(height: 8),
                Text(
                  category.$1,
                  maxLines: 2,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 11),
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 24),
        const Text(
          'Rekomendasi Perjalanan',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        const Card(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              children: [
                Icon(Icons.travel_explore, size: 42, color: Color(0xFF1769AA)),
                SizedBox(height: 12),
                Text(
                  'Menunggu katalog perjalanan',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                SizedBox(height: 6),
                Text(
                  'Paket akan ditampilkan setelah integrasi API tersedia.',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _placeholder(String title, IconData icon) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 54, color: const Color(0xFF1769AA)),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text('Fitur akan dihubungkan ke Server Segaloka.'),
        ],
      ),
    );
  }
}
