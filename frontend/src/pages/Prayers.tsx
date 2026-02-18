import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { islamicApi, authApi } from '../services/api';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Check, Clock, MapPin } from 'lucide-react';

const PRAYER_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PRAYER_LABELS: { [key: string]: string } = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

// Fremont, CA coordinates
const LOCATION = { latitude: 37.5485, longitude: -121.9886 };

export default function Prayers() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<number | null>(user?.id || null);
  const [prayerTimes, setPrayerTimes] = useState<{ [key: string]: string }>({});
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Fetch prayer times from Aladhan API
  useEffect(() => {
    const fetchPrayerTimes = async () => {
      try {
        const dateFormatted = format(selectedDate, 'dd-MM-yyyy');
        const response = await fetch(
          `https://api.aladhan.com/v1/timings/${dateFormatted}?latitude=${LOCATION.latitude}&longitude=${LOCATION.longitude}&method=2`
        );
        const data = await response.json();
        if (data.data?.timings) {
          setPrayerTimes({
            fajr: data.data.timings.Fajr,
            dhuhr: data.data.timings.Dhuhr,
            asr: data.data.timings.Asr,
            maghrib: data.data.timings.Maghrib,
            isha: data.data.timings.Isha,
          });
        }
      } catch (error) {
        console.error('Failed to fetch prayer times:', error);
      }
    };
    fetchPrayerTimes();
  }, [selectedDate]);

  const { data: prayers, isLoading } = useQuery({
    queryKey: ['prayers', selectedUser, dateStr],
    queryFn: () => islamicApi.getDailyPrayers(selectedUser!, dateStr),
    enabled: !!selectedUser,
  });

  const { data: family } = useQuery({
    queryKey: ['family'],
    queryFn: authApi.getFamily,
    enabled: user?.role === 'parent',
  });

  const logPrayerMutation = useMutation({
    mutationFn: islamicApi.logPrayer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
    },
  });

  const handlePrayerToggle = (prayerName: string, currentStatus: string) => {
    const newStatus = currentStatus === 'not_prayed' ? 'prayed_on_time' : 'not_prayed';
    logPrayerMutation.mutate({
      user_id: selectedUser,
      prayer_name: prayerName,
      date: dateStr,
      status: newStatus,
      time_prayed: newStatus !== 'not_prayed' ? format(new Date(), 'HH:mm:ss') : null,
    });
  };

  const getPrayerStatus = (prayerName: string) => {
    const prayer = prayers?.prayers?.find((p: any) => p.prayer_name === prayerName);
    return prayer?.status || 'not_prayed';
  };

  const getPrayerInMasjid = (prayerName: string) => {
    const prayer = prayers?.prayers?.find((p: any) => p.prayer_name === prayerName);
    return prayer?.in_masjid || false;
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prayer Tracker</h1>
        {user?.role === 'parent' && family && (
          <select
            value={selectedUser || ''}
            onChange={(e) => setSelectedUser(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            {family.map((member: any) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Date Navigation */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <p className="text-lg font-semibold">
              {isToday ? 'Today' : format(selectedDate, 'EEEE')}
            </p>
            <p className="text-sm text-gray-500">
              {format(selectedDate, 'MMMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
            disabled={isToday}
          >
            <ChevronRight size={24} className={isToday ? 'text-gray-300' : ''} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Daily Progress</span>
          <span className="text-islamic-green font-bold">
            {prayers?.completed_count || 0} / {prayers?.total_count || 5}
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-islamic-green transition-all duration-300"
            style={{
              width: `${((prayers?.completed_count || 0) / (prayers?.total_count || 5)) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Prayer List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          PRAYER_NAMES.map((prayerName) => {
            const status = getPrayerStatus(prayerName);
            const isPrayed = status !== 'not_prayed';
            const inMasjid = getPrayerInMasjid(prayerName);
            const prayerTime = prayerTimes[prayerName] || '--:--';
            const prayerLabel = PRAYER_LABELS[prayerName];

            return (
              <div
                key={prayerName}
                className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                  inMasjid ? 'border-purple-500' : isPrayed ? 'border-green-500' : 'border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handlePrayerToggle(prayerName, status)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                        inMasjid
                          ? 'bg-purple-500 text-white'
                          : isPrayed
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {inMasjid ? <MapPin size={24} /> : isPrayed ? <Check size={24} /> : <Clock size={24} />}
                    </button>
                    <div>
                      <h3 className="font-semibold text-lg">{prayerLabel}</h3>
                      <p className="text-sm text-gray-500">{prayerTime}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    {inMasjid ? (
                      <span className="inline-flex items-center gap-1 text-purple-600 text-sm">
                        <MapPin size={16} />
                        In Masjid
                      </span>
                    ) : isPrayed ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                        <Check size={16} />
                        Prayed
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Not yet</span>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                {!isPrayed && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() =>
                        logPrayerMutation.mutate({
                          user_id: selectedUser,
                          prayer_name: prayerName,
                          date: dateStr,
                          status: 'prayed_on_time',
                          in_masjid: false,
                        })
                      }
                      className="flex-1 py-2 px-3 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100"
                    >
                      Mark as Prayed
                    </button>
                    <button
                      onClick={() =>
                        logPrayerMutation.mutate({
                          user_id: selectedUser,
                          prayer_name: prayerName,
                          date: dateStr,
                          status: 'prayed_on_time',
                          in_masjid: true,
                        })
                      }
                      className="flex items-center gap-1 py-2 px-3 bg-purple-50 text-purple-700 rounded-lg text-sm hover:bg-purple-100"
                    >
                      <MapPin size={14} />
                      In Masjid
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
