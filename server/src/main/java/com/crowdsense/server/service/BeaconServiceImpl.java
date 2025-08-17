package com.crowdsense.server.service;

import com.crowdsense.server.dto.response.BeaconSummary;
import com.crowdsense.server.model.Information;
import com.crowdsense.server.model.Scan;
import com.crowdsense.server.repository.InformationRepository;
import com.crowdsense.server.repository.ScanRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BeaconServiceImpl implements BeaconService {

    private final InformationRepository infoRepo;
    private final ScanRepository scanRepo;

    public BeaconServiceImpl(InformationRepository infoRepo, ScanRepository scanRepo) {
        this.infoRepo = infoRepo;
        this.scanRepo = scanRepo;
    }

    @Override
    public List<BeaconSummary> getBeaconIdsByGeo(double lat, double lon, String region, double radiusMeters, int limit) {
        List<Information> candidates = infoRepo.queryByRegion(region, limit * 5);

        return candidates.stream()
                .filter(i -> i.getLatitude() != null && i.getLongitude() != null)
                .map(i -> new Dist(i, distanceMeters(lat, lon, i.getLatitude(), i.getLongitude())))
                .sorted(Comparator.comparingDouble(d -> d.distance))
                .limit(limit)
                .map(d -> BeaconSummary.from(d.info))
                .collect(Collectors.toList());
    }

    @Override
    public List<BeaconSummary> getBeaconIdsByName(String name, boolean strict, int limit) {
        return infoRepo.queryByName(name, strict, limit).stream()
                .map(BeaconSummary::from)
                .collect(Collectors.toList());
    }

    @Override
    public List<BeaconSummary> getBeaconIdsByRegion(String region, int limit) {
        return infoRepo.queryByRegion(region, limit).stream()
                .map(BeaconSummary::from)
                .collect(Collectors.toList());
    }

    @Override
    public BeaconSummary getBeaconById(String id) {
        Information info = infoRepo.queryById(id);
        return (info == null) ? null : BeaconSummary.from(info);
    }

    @Override
    public double getCrowdAverage(String id, int minutes) {
        long now = Instant.now().getEpochSecond();
        long from = now - (minutes * 60L);

        List<Scan> scans = scanRepo.queryBetween(id, from, now);

        long sum = 0;
        long cnt = 0;
        for (Scan s : scans) {
            if (s.getCount() != null) {
                sum += s.getCount();
                cnt++;
            }
        }
        return cnt == 0 ? 0.0 : (double) sum / cnt;
    }

    private record Dist(Information info, double distance) {}
    private static double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon/2) * Math.sin(dLon/2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
}
