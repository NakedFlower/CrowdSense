package com.crowdsense.server.service;

import com.crowdsense.server.dto.response.BeaconSummary;
import com.crowdsense.server.dto.response.CrowdStatResponse;
import com.crowdsense.server.model.Information;
import com.crowdsense.server.model.Scan;
import com.crowdsense.server.repository.InformationRepository;
import com.crowdsense.server.repository.ScanRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
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

    @Override
    public CrowdStatResponse getCrowdStat(String id, int periodDays) {
        Instant now = Instant.now();
        ZonedDateTime zdt = ZonedDateTime.ofInstant(now, ZoneOffset.UTC)
                                         .withMinute(0).withSecond(0).withNano(0);
        long nowHourFloor = zdt.toEpochSecond();

        int hours = periodDays * 24;
        long start = nowHourFloor - (hours * 3600L);
        long endExclusive = nowHourFloor;
        long endInclusive = endExclusive - 1;

        var points = scanRepo.queryBetweenProjected(id, start, endInclusive);

        double[] sum = new double[hours];
        int[] cnt = new int[hours];
        for (ScanRepository.ScanPoint p : points) {
            if (p.count() == null) continue;
            long ts = p.timestamp();
            if (ts < start || ts >= endExclusive) continue;
            int bucket = (int)((ts - start) / 3600L);
            if (bucket < 0 || bucket >= hours) continue;
            sum[bucket] += p.count();
            cnt[bucket] += 1;
        }

        ArrayList<Double> list = new ArrayList<>(hours);
        for (int i = 0; i < hours; i++) {
            list.add(cnt[i] == 0 ? 0.0 : (sum[i] / cnt[i]));
        }

        return new CrowdStatResponse(list, start);
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
