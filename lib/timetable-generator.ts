// ===========================================
// Timetable Generation Algorithm
// Constraint Satisfaction Problem (CSP) Based Scheduler
// ===========================================

import mongoose from 'mongoose';

// Types for generation
export interface SubjectRequirement {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  type: 'theory' | 'practical' | 'both' | 'lab' | 'project';
  lecturesPerWeek: number;
  theoryHoursPerWeek: number;
  practicalHoursPerWeek: number;
  assignedFaculty?: string;
}

export interface FacultyInfo {
  facultyId: string;
  name: string;
  email: string;
  maxHoursPerDay?: number;
  maxHoursPerWeek?: number;
  unavailableSlots?: { day: number; slot: number }[];
  preferredSlots?: { day: number; slot: number }[];
}

export interface RoomInfo {
  roomId: string;
  name: string;
  type: 'lecture' | 'lab' | 'seminar' | 'workshop';
  capacity: number;
  building: string;
  floor: string;
}

export interface BatchInfo {
  batchId: string;
  name: string;
  studentCount: number;
  semester: number;
}

export interface TimeSlotInfo {
  slotNumber: number;
  name: string;
  startTime: string;
  endTime: string;
  type: 'theory' | 'practical' | 'break' | 'lunch';
  duration: number;
}

export interface TimetableEntry {
  day: number;
  slot: number;
  subject: mongoose.Types.ObjectId;
  faculty: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  batch: mongoose.Types.ObjectId;
  type: 'theory' | 'practical';
}

export interface GenerationOptions {
  maxGapsPerDay?: number;
  preferConsecutiveLectures?: boolean;
  balanceFacultyLoad?: boolean;
  prioritizePreferredSlots?: boolean;
  maxRetries?: number;
}

export interface GenerationResult {
  success: boolean;
  entries: TimetableEntry[];
  hardConstraintViolations: number;
  softConstraintViolations: number;
  optimizationScore: number;
  conflicts: ConflictInfo[];
  stats: GenerationStats;
}

export interface ConflictInfo {
  type: 'faculty_clash' | 'room_clash' | 'batch_clash' | 'capacity' | 'gap' | 'overload';
  severity: 'hard' | 'soft';
  message: string;
  day?: number;
  slot?: number;
  entities?: string[];
}

export interface GenerationStats {
  totalClasses: number;
  placedClasses: number;
  unplacedClasses: number;
  iterations: number;
  timeTaken: number;
}

// Constants
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_DAYS = 6;

/**
 * Main Timetable Generator Class
 * Uses CSP with backtracking and constraint propagation
 */
export class TimetableGenerator {
  private subjects: SubjectRequirement[];
  private faculty: Map<string, FacultyInfo>;
  private rooms: RoomInfo[];
  private batches: BatchInfo[];
  private timeSlots: TimeSlotInfo[];
  private options: GenerationOptions;
  
  // State tracking
  private schedule: Map<string, TimetableEntry>; // key: "day-slot-batch"
  private facultySchedule: Map<string, Set<string>>; // facultyId -> Set of "day-slot"
  private roomSchedule: Map<string, Set<string>>; // roomId -> Set of "day-slot"
  private batchSchedule: Map<string, Set<string>>; // batchId -> Set of "day-slot"
  
  constructor(
    subjects: SubjectRequirement[],
    faculty: FacultyInfo[],
    rooms: RoomInfo[],
    batches: BatchInfo[],
    timeSlots: TimeSlotInfo[],
    options: GenerationOptions = {}
  ) {
    this.subjects = subjects;
    this.faculty = new Map(faculty.map(f => [f.facultyId, f]));
    this.rooms = rooms;
    this.batches = batches;
    this.timeSlots = timeSlots.filter(ts => ts.type !== 'break' && ts.type !== 'lunch');
    this.options = {
      maxGapsPerDay: options.maxGapsPerDay ?? 2,
      preferConsecutiveLectures: options.preferConsecutiveLectures ?? true,
      balanceFacultyLoad: options.balanceFacultyLoad ?? true,
      prioritizePreferredSlots: options.prioritizePreferredSlots ?? true,
      maxRetries: options.maxRetries ?? 100,
    };
    
    this.schedule = new Map();
    this.facultySchedule = new Map();
    this.roomSchedule = new Map();
    this.batchSchedule = new Map();
    
    // Initialize faculty schedule maps
    faculty.forEach(f => this.facultySchedule.set(f.facultyId, new Set()));
    rooms.forEach(r => this.roomSchedule.set(r.roomId, new Set()));
    batches.forEach(b => this.batchSchedule.set(b.batchId, new Set()));
  }

  /**
   * Generate timetable for all batches
   */
  async generate(): Promise<GenerationResult> {
    const startTime = Date.now();
    const conflicts: ConflictInfo[] = [];
    let iterations = 0;
    
    // Create class requirements list
    const classRequirements = this.createClassRequirements();
    
    // Sort by constraints (most constrained first - MRV heuristic)
    classRequirements.sort((a, b) => {
      // Subjects with assigned faculty are more constrained
      const aHasFaculty = a.facultyId ? 1 : 0;
      const bHasFaculty = b.facultyId ? 1 : 0;
      if (aHasFaculty !== bHasFaculty) return bHasFaculty - aHasFaculty;
      
      // Practical/lab classes are more constrained (need specific rooms)
      const aIsPractical = a.type === 'practical' ? 1 : 0;
      const bIsPractical = b.type === 'practical' ? 1 : 0;
      return bIsPractical - aIsPractical;
    });
    
    // Try to place each class
    for (const req of classRequirements) {
      iterations++;
      const placed = this.placeClass(req);
      
      if (!placed) {
        conflicts.push({
          type: 'faculty_clash',
          severity: 'hard',
          message: `Could not place ${req.subjectName} for batch ${req.batchName}`,
          entities: [req.subjectCode, req.batchName],
        });
      }
    }
    
    // Calculate violations and score
    const hardViolations = this.countHardConstraintViolations();
    const softViolations = this.countSoftConstraintViolations();
    const optimizationScore = this.calculateOptimizationScore();
    
    // Convert schedule to entries
    const entries = this.convertToEntries();
    
    const timeTaken = Date.now() - startTime;
    
    return {
      success: hardViolations === 0,
      entries,
      hardConstraintViolations: hardViolations,
      softConstraintViolations: softViolations,
      optimizationScore,
      conflicts: [...conflicts, ...this.detectConflicts()],
      stats: {
        totalClasses: classRequirements.length,
        placedClasses: entries.length,
        unplacedClasses: classRequirements.length - entries.length,
        iterations,
        timeTaken,
      },
    };
  }

  /**
   * Create list of all classes that need to be scheduled
   */
  private createClassRequirements(): ClassRequirement[] {
    const requirements: ClassRequirement[] = [];
    
    for (const batch of this.batches) {
      for (const subject of this.subjects) {
        // Theory classes
        if (subject.type === 'theory' || subject.type === 'both') {
          for (let i = 0; i < subject.lecturesPerWeek; i++) {
            requirements.push({
              subjectId: subject.subjectId,
              subjectName: subject.subjectName,
              subjectCode: subject.subjectCode,
              batchId: batch.batchId,
              batchName: batch.name,
              studentCount: batch.studentCount,
              type: 'theory',
              facultyId: subject.assignedFaculty,
            });
          }
        }
        
        // Practical/lab classes
        if (subject.type === 'practical' || subject.type === 'both' || subject.type === 'lab') {
          const practicalCount = Math.ceil(subject.practicalHoursPerWeek / 2); // Assuming 2-hour practicals
          for (let i = 0; i < practicalCount; i++) {
            requirements.push({
              subjectId: subject.subjectId,
              subjectName: subject.subjectName,
              subjectCode: subject.subjectCode,
              batchId: batch.batchId,
              batchName: batch.name,
              studentCount: batch.studentCount,
              type: 'practical',
              facultyId: subject.assignedFaculty,
            });
          }
        }
      }
    }
    
    return requirements;
  }

  /**
   * Try to place a class in an available slot
   */
  private placeClass(req: ClassRequirement): boolean {
    const availableSlots = this.getAvailableSlots(req);
    
    if (availableSlots.length === 0) {
      return false;
    }
    
    // Score and sort available slots
    const scoredSlots = availableSlots.map(slot => ({
      ...slot,
      score: this.scoreSlot(slot, req),
    })).sort((a, b) => b.score - a.score);
    
    // Try to place in best slot
    for (const slot of scoredSlots) {
      if (this.tryPlace(req, slot.day, slot.slot, slot.roomId, slot.facultyId)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get all available slots for a class requirement
   */
  private getAvailableSlots(req: ClassRequirement): AvailableSlot[] {
    const slots: AvailableSlot[] = [];
    
    for (let day = 0; day < MAX_DAYS; day++) {
      for (const timeSlot of this.timeSlots) {
        // Skip if batch already has class at this time
        if (this.batchSchedule.get(req.batchId)?.has(`${day}-${timeSlot.slotNumber}`)) {
          continue;
        }
        
        // Find available rooms
        const availableRooms = this.getAvailableRooms(day, timeSlot.slotNumber, req);
        
        // Find available faculty
        const availableFaculty = this.getAvailableFaculty(day, timeSlot.slotNumber, req);
        
        // Add all combinations
        for (const room of availableRooms) {
          for (const faculty of availableFaculty) {
            slots.push({
              day,
              slot: timeSlot.slotNumber,
              roomId: room.roomId,
              facultyId: faculty.facultyId,
            });
          }
        }
      }
    }
    
    return slots;
  }

  /**
   * Get available rooms for a specific time slot
   */
  private getAvailableRooms(day: number, slot: number, req: ClassRequirement): RoomInfo[] {
    return this.rooms.filter(room => {
      // Check if room is free
      if (this.roomSchedule.get(room.roomId)?.has(`${day}-${slot}`)) {
        return false;
      }
      
      // Check room type matches class type
      if (req.type === 'practical' && room.type !== 'lab' && room.type !== 'workshop') {
        return false;
      }
      
      // Check capacity
      if (room.capacity < req.studentCount) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Get available faculty for a specific time slot
   */
  private getAvailableFaculty(day: number, slot: number, req: ClassRequirement): FacultyInfo[] {
    // If faculty is assigned, only return that faculty if available
    if (req.facultyId) {
      const faculty = this.faculty.get(req.facultyId);
      if (faculty && !this.facultySchedule.get(req.facultyId)?.has(`${day}-${slot}`)) {
        // Check if not in unavailable slots
        const isUnavailable = faculty.unavailableSlots?.some(
          us => us.day === day && us.slot === slot
        );
        if (!isUnavailable) {
          return [faculty];
        }
      }
      return [];
    }
    
    // Return all available faculty
    return Array.from(this.faculty.values()).filter(faculty => {
      if (this.facultySchedule.get(faculty.facultyId)?.has(`${day}-${slot}`)) {
        return false;
      }
      
      const isUnavailable = faculty.unavailableSlots?.some(
        us => us.day === day && us.slot === slot
      );
      
      return !isUnavailable;
    });
  }

  /**
   * Score a slot based on optimization preferences
   */
  private scoreSlot(slot: AvailableSlot, req: ClassRequirement): number {
    let score = 100;
    
    // Prefer earlier slots in the day
    score -= slot.slot * 2;
    
    // Prefer earlier days in the week
    score -= slot.day * 1;
    
    // Bonus for preferred slots
    if (this.options.prioritizePreferredSlots) {
      const faculty = this.faculty.get(slot.facultyId);
      const isPreferred = faculty?.preferredSlots?.some(
        ps => ps.day === slot.day && ps.slot === slot.slot
      );
      if (isPreferred) {
        score += 20;
      }
    }
    
    // Penalty for creating gaps
    if (this.options.preferConsecutiveLectures) {
      const batchScheduledSlots = this.batchSchedule.get(req.batchId);
      if (batchScheduledSlots && batchScheduledSlots.size > 0) {
        // Check if adjacent to existing class on same day
        const hasAdjacentBefore = batchScheduledSlots.has(`${slot.day}-${slot.slot - 1}`);
        const hasAdjacentAfter = batchScheduledSlots.has(`${slot.day}-${slot.slot + 1}`);
        
        if (hasAdjacentBefore || hasAdjacentAfter) {
          score += 15;
        }
      }
    }
    
    // Balance faculty load
    if (this.options.balanceFacultyLoad) {
      const facultyLoad = this.facultySchedule.get(slot.facultyId)?.size || 0;
      score -= facultyLoad * 3; // Prefer faculty with less load
    }
    
    return score;
  }

  /**
   * Try to place a class at a specific slot
   */
  private tryPlace(
    req: ClassRequirement,
    day: number,
    slot: number,
    roomId: string,
    facultyId: string
  ): boolean {
    const key = `${day}-${slot}-${req.batchId}`;
    
    // Double check availability
    if (this.schedule.has(key)) {
      return false;
    }
    
    if (this.facultySchedule.get(facultyId)?.has(`${day}-${slot}`)) {
      return false;
    }
    
    if (this.roomSchedule.get(roomId)?.has(`${day}-${slot}`)) {
      return false;
    }
    
    // Place the class
    const entry: TimetableEntry = {
      day,
      slot,
      subject: new mongoose.Types.ObjectId(req.subjectId),
      faculty: new mongoose.Types.ObjectId(facultyId),
      room: new mongoose.Types.ObjectId(roomId),
      batch: new mongoose.Types.ObjectId(req.batchId),
      type: req.type,
    };
    
    this.schedule.set(key, entry);
    this.facultySchedule.get(facultyId)?.add(`${day}-${slot}`);
    this.roomSchedule.get(roomId)?.add(`${day}-${slot}`);
    this.batchSchedule.get(req.batchId)?.add(`${day}-${slot}`);
    
    return true;
  }

  /**
   * Count hard constraint violations
   */
  private countHardConstraintViolations(): number {
    let violations = 0;
    
    // Check for double bookings (should be 0 if algorithm works correctly)
    // These are prevented by the algorithm, but we check just in case
    
    const facultySlots = new Map<string, Set<string>>();
    const roomSlots = new Map<string, Set<string>>();
    
    for (const entry of this.schedule.values()) {
      const slotKey = `${entry.day}-${entry.slot}`;
      const facultyId = entry.faculty.toString();
      const roomId = entry.room.toString();
      
      // Faculty double booking
      if (!facultySlots.has(facultyId)) {
        facultySlots.set(facultyId, new Set());
      }
      if (facultySlots.get(facultyId)?.has(slotKey)) {
        violations++;
      }
      facultySlots.get(facultyId)?.add(slotKey);
      
      // Room double booking
      if (!roomSlots.has(roomId)) {
        roomSlots.set(roomId, new Set());
      }
      if (roomSlots.get(roomId)?.has(slotKey)) {
        violations++;
      }
      roomSlots.get(roomId)?.add(slotKey);
    }
    
    return violations;
  }

  /**
   * Count soft constraint violations
   */
  private countSoftConstraintViolations(): number {
    let violations = 0;
    
    // Count gaps per batch per day
    for (const batch of this.batches) {
      for (let day = 0; day < MAX_DAYS; day++) {
        const gaps = this.countGapsForBatchOnDay(batch.batchId, day);
        if (gaps > (this.options.maxGapsPerDay || 2)) {
          violations += gaps - (this.options.maxGapsPerDay || 2);
        }
      }
    }
    
    // Check faculty overload (more than 6 hours per day)
    for (const [facultyId, slots] of this.facultySchedule) {
      const faculty = this.faculty.get(facultyId);
      const maxPerDay = faculty?.maxHoursPerDay || 6;
      
      for (let day = 0; day < MAX_DAYS; day++) {
        let hoursOnDay = 0;
        for (const slot of slots) {
          if (slot.startsWith(`${day}-`)) {
            hoursOnDay++;
          }
        }
        if (hoursOnDay > maxPerDay) {
          violations += hoursOnDay - maxPerDay;
        }
      }
    }
    
    return violations;
  }

  /**
   * Count gaps in schedule for a batch on a specific day
   */
  private countGapsForBatchOnDay(batchId: string, day: number): number {
    const slots = Array.from(this.batchSchedule.get(batchId) || [])
      .filter(s => s.startsWith(`${day}-`))
      .map(s => parseInt(s.split('-')[1]))
      .sort((a, b) => a - b);
    
    if (slots.length < 2) return 0;
    
    let gaps = 0;
    for (let i = 1; i < slots.length; i++) {
      const gap = slots[i] - slots[i - 1] - 1;
      if (gap > 0) gaps += gap;
    }
    
    return gaps;
  }

  /**
   * Calculate overall optimization score (0-10)
   */
  private calculateOptimizationScore(): number {
    let score = 10;
    
    // Deduct for hard violations
    score -= this.countHardConstraintViolations() * 2;
    
    // Deduct for soft violations
    score -= this.countSoftConstraintViolations() * 0.5;
    
    // Deduct for unplaced classes
    const totalRequired = this.createClassRequirements().length;
    const placed = this.schedule.size;
    const placementRate = placed / totalRequired;
    score -= (1 - placementRate) * 5;
    
    return Math.max(0, Math.min(10, score));
  }

  /**
   * Detect conflicts in the schedule
   */
  private detectConflicts(): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    
    // Check for gaps
    for (const batch of this.batches) {
      for (let day = 0; day < MAX_DAYS; day++) {
        const gaps = this.countGapsForBatchOnDay(batch.batchId, day);
        if (gaps > (this.options.maxGapsPerDay || 2)) {
          conflicts.push({
            type: 'gap',
            severity: 'soft',
            message: `${batch.name} has ${gaps} gaps on ${DAYS[day]}`,
            day,
            entities: [batch.name],
          });
        }
      }
    }
    
    // Check faculty overload
    for (const [facultyId, slots] of this.facultySchedule) {
      const faculty = this.faculty.get(facultyId);
      const maxPerDay = faculty?.maxHoursPerDay || 6;
      
      for (let day = 0; day < MAX_DAYS; day++) {
        let hoursOnDay = 0;
        for (const slot of slots) {
          if (slot.startsWith(`${day}-`)) {
            hoursOnDay++;
          }
        }
        if (hoursOnDay > maxPerDay) {
          conflicts.push({
            type: 'overload',
            severity: 'soft',
            message: `${faculty?.name} has ${hoursOnDay} hours on ${DAYS[day]} (max: ${maxPerDay})`,
            day,
            entities: [faculty?.name || facultyId],
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Convert internal schedule to timetable entries
   */
  private convertToEntries(): TimetableEntry[] {
    return Array.from(this.schedule.values());
  }
}

// Internal types
interface ClassRequirement {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  batchId: string;
  batchName: string;
  studentCount: number;
  type: 'theory' | 'practical';
  facultyId?: string;
}

interface AvailableSlot {
  day: number;
  slot: number;
  roomId: string;
  facultyId: string;
}

// ===========================================
// Conflict Detection Service
// ===========================================

export interface ConflictCheckResult {
  hasConflicts: boolean;
  hardConflicts: ConflictInfo[];
  softConflicts: ConflictInfo[];
  score: number;
}

/**
 * Check timetable entries for conflicts
 */
export function checkConflicts(
  entries: TimetableEntry[],
  options: { maxGapsPerDay?: number; maxHoursPerDay?: number } = {}
): ConflictCheckResult {
  const hardConflicts: ConflictInfo[] = [];
  const softConflicts: ConflictInfo[] = [];
  
  const maxGapsPerDay = options.maxGapsPerDay ?? 2;
  const maxHoursPerDay = options.maxHoursPerDay ?? 6;
  
  // Group by slot for conflict detection
  const slotMap = new Map<string, TimetableEntry[]>();
  const facultyDayMap = new Map<string, number[]>();
  const batchDayMap = new Map<string, number[]>();
  
  for (const entry of entries) {
    const slotKey = `${entry.day}-${entry.slot}`;
    
    if (!slotMap.has(slotKey)) {
      slotMap.set(slotKey, []);
    }
    slotMap.get(slotKey)?.push(entry);
    
    // Track faculty per day
    const facultyDayKey = `${entry.faculty.toString()}-${entry.day}`;
    if (!facultyDayMap.has(facultyDayKey)) {
      facultyDayMap.set(facultyDayKey, []);
    }
    facultyDayMap.get(facultyDayKey)?.push(entry.slot);
    
    // Track batch per day
    const batchDayKey = `${entry.batch.toString()}-${entry.day}`;
    if (!batchDayMap.has(batchDayKey)) {
      batchDayMap.set(batchDayKey, []);
    }
    batchDayMap.get(batchDayKey)?.push(entry.slot);
  }
  
  // Check for conflicts at each slot
  for (const [slotKey, slotEntries] of slotMap) {
    const [day, slot] = slotKey.split('-').map(Number);
    
    // Faculty double booking
    const facultyIds = slotEntries.map(e => e.faculty.toString());
    const duplicateFaculty = facultyIds.filter((id, i) => facultyIds.indexOf(id) !== i);
    for (const facultyId of new Set(duplicateFaculty)) {
      hardConflicts.push({
        type: 'faculty_clash',
        severity: 'hard',
        message: `Faculty double-booked on ${DAYS[day]} slot ${slot}`,
        day,
        slot,
        entities: [facultyId],
      });
    }
    
    // Room double booking
    const roomIds = slotEntries.map(e => e.room.toString());
    const duplicateRooms = roomIds.filter((id, i) => roomIds.indexOf(id) !== i);
    for (const roomId of new Set(duplicateRooms)) {
      hardConflicts.push({
        type: 'room_clash',
        severity: 'hard',
        message: `Room double-booked on ${DAYS[day]} slot ${slot}`,
        day,
        slot,
        entities: [roomId],
      });
    }
    
    // Batch clash
    const batchIds = slotEntries.map(e => e.batch.toString());
    const duplicateBatches = batchIds.filter((id, i) => batchIds.indexOf(id) !== i);
    for (const batchId of new Set(duplicateBatches)) {
      hardConflicts.push({
        type: 'batch_clash',
        severity: 'hard',
        message: `Batch has multiple classes on ${DAYS[day]} slot ${slot}`,
        day,
        slot,
        entities: [batchId],
      });
    }
  }
  
  // Check gaps and overload
  for (const [key, slots] of batchDayMap) {
    const sortedSlots = slots.sort((a, b) => a - b);
    let gaps = 0;
    for (let i = 1; i < sortedSlots.length; i++) {
      gaps += sortedSlots[i] - sortedSlots[i - 1] - 1;
    }
    if (gaps > maxGapsPerDay) {
      const [batchId, dayStr] = key.split('-');
      softConflicts.push({
        type: 'gap',
        severity: 'soft',
        message: `Batch has ${gaps} gaps (max: ${maxGapsPerDay})`,
        day: parseInt(dayStr),
        entities: [batchId],
      });
    }
  }
  
  for (const [key, slots] of facultyDayMap) {
    if (slots.length > maxHoursPerDay) {
      const [facultyId, dayStr] = key.split('-');
      softConflicts.push({
        type: 'overload',
        severity: 'soft',
        message: `Faculty has ${slots.length} classes (max: ${maxHoursPerDay})`,
        day: parseInt(dayStr),
        entities: [facultyId],
      });
    }
  }
  
  // Calculate score
  let score = 10;
  score -= hardConflicts.length * 2;
  score -= softConflicts.length * 0.5;
  score = Math.max(0, Math.min(10, score));
  
  return {
    hasConflicts: hardConflicts.length > 0,
    hardConflicts,
    softConflicts,
    score,
  };
}
