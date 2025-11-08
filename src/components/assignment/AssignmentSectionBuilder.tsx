import React, { useEffect, useMemo, useState } from 'react';
import { AssignmentPortion, ClassworkJuzSelection, ClassworkSection } from '../../types/assignment';
import { JUZ_SUMMARIES, buildPortionApproxRange } from '../../data/juzBoundaries';

type SectionType = 'sabq' | 'sabqi' | 'manzil';

interface SectionDraft {
  id: string;
  step: SectionType;
  label: string;
  notes: string;
  juzSelections: ClassworkJuzSelection[];
}

interface AssignmentSectionBuilderProps {
  value?: ClassworkSection[];
  onChange: (sections: ClassworkSection[]) => void;
}

interface JuzPickerState {
  sectionId: string | null;
  selectedJuz: number | null;
  isCustom: boolean;
  customStart?: number;
  customEnd?: number;
}

const SECTION_META: Record<
  SectionType,
  { label: string; description: string; emoji: string; color: string }
> = {
  sabq: {
    label: 'Sabq',
    description: 'New lesson (fresh memorization)',
    emoji: '✨',
    color: 'from-emerald-500/15 to-emerald-400/10',
  },
  sabqi: {
    label: 'Sabqi',
    description: 'Recent revision (last 7 lessons)',
    emoji: '🧠',
    color: 'from-sky-500/15 to-sky-400/10',
  },
  manzil: {
    label: 'Manzil',
    description: 'Established review (long-term)',
    emoji: '🔁',
    color: 'from-violet-500/15 to-violet-400/10',
  },
};

const KEYWORD_ALIASES: Record<string, SectionType> = {
  sabq: 'sabq',
  sabqi: 'sabqi',
  sabaq: 'sabq',
  revision: 'sabqi',
  manzil: 'manzil',
  review: 'manzil',
};

const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const serializeSections = (sections: ClassworkSection[] = []) =>
  JSON.stringify(
    sections.map((section) => ({
      step: section.step,
      label: section.label,
      details: section.details,
      assignmentRange: section.assignmentRange,
      assignmentPortion: section.assignmentPortion,
      juzSelections: section.juzSelections,
    }))
  );

const mapIncomingToDraft = (sections: ClassworkSection[] = []): SectionDraft[] => {
  if (!sections.length) return [];

  return sections.map((section) => ({
    id: generateId(),
    step: (section.step as SectionType) || 'sabq',
    label:
      section.label ||
      section.title ||
      SECTION_META[(section.step as SectionType) || 'sabq'].label,
    notes: section.details || '',
    juzSelections:
      (section.juzSelections && section.juzSelections.length > 0
        ? section.juzSelections
        : [
            {
              id: generateId(),
              juzNumber: Number(section.assignmentRange?.match(/Juz\s(\d+)/)?.[1]) || 1,
              portion: (section.assignmentPortion as AssignmentPortion) || 'custom',
              label: section.assignmentRange,
            },
          ]) ?? [],
  }));
};

const AssignmentSectionBuilder: React.FC<AssignmentSectionBuilderProps> = ({
  value = [],
  onChange,
}) => {
  const [sections, setSections] = useState<SectionDraft[]>(() => mapIncomingToDraft(value));
  const [inputValue, setInputValue] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    sections[0]?.id || null
  );
  const [juzPicker, setJuzPicker] = useState<JuzPickerState>({
    sectionId: null,
    selectedJuz: null,
    isCustom: false,
  });

  const incomingSignature = useMemo(() => serializeSections(value), [value]);

  useEffect(() => {
    // Sync with incoming updates (edit mode)
    const nextDraft = mapIncomingToDraft(value);
    const nextSignature = serializeSections(
      nextDraft.map((section) => ({
        step: section.step,
        label: section.label,
        details: section.notes,
        assignmentRange: section.juzSelections.map((sel) => sel.label).join(', '),
        assignmentPortion: section.juzSelections[0]?.portion,
        juzSelections: section.juzSelections,
      }))
    );

    if (incomingSignature !== nextSignature) {
      setSections(nextDraft);
      setActiveSectionId(nextDraft[0]?.id || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingSignature]);

  useEffect(() => {
    const mapped: ClassworkSection[] = sections.map((section, index) => {
      const summaryParts = section.juzSelections.map((selection) => {
        if (selection.label) return selection.label;

        const juzSummary = JUZ_SUMMARIES.find(
          (summary) => summary.number === selection.juzNumber
        );
        const base = `Juz ${selection.juzNumber}`;
        const portionLabel =
          selection.portion === 'quarter'
            ? `${selection.segmentIndex === 0 ? '1st' : selection.segmentIndex === 1 ? '2nd' : selection.segmentIndex === 2 ? '3rd' : '4th'} ¼`
            : selection.portion === 'half'
            ? selection.segmentIndex === 0
              ? '1st ½'
              : '2nd ½'
            : selection.portion === 'three_quarters'
            ? '¾'
            : selection.portion === 'full'
            ? 'Full'
            : 'Custom';

        const range =
          selection.approxRange?.startAyah && selection.approxRange?.endAyah
            ? `āyāt ${selection.approxRange.startAyah}-${selection.approxRange.endAyah}`
            : selection.customRange?.startAyah && selection.customRange?.endAyah
            ? `āyāt ${selection.customRange.startAyah}-${selection.customRange.endAyah}`
            : juzSummary
            ? `${juzSummary.startSurahName} ${juzSummary.startAyah} → ${juzSummary.endSurahName} ${juzSummary.endAyah}`
            : '';

        return `${base} • ${portionLabel}${range ? ` (${range})` : ''}`;
      });

      return {
        step: section.step,
        title: section.label,
        label: section.label,
        details: section.notes,
        order: index,
        assignmentRange: summaryParts.join(' • '),
        assignmentPortion:
          section.juzSelections.length === 1
            ? section.juzSelections[0]?.portion || 'custom'
            : 'multi',
        summary: summaryParts.join(' • '),
        juzSelections: section.juzSelections,
      };
    });

    onChange(mapped);
  }, [sections, onChange]);

  const handleProcessKeyword = (rawValue: string) => {
    const keyword = rawValue.trim().toLowerCase();
    if (!keyword) return;

    if (KEYWORD_ALIASES[keyword]) {
      handleAddSection(KEYWORD_ALIASES[keyword]);
      setInputValue('');
      return;
    }

    if (keyword === 'juz') {
      if (activeSectionId) {
        setJuzPicker({ sectionId: activeSectionId, selectedJuz: null, isCustom: false });
      }
      setInputValue('');
    }
  };

  const handleAddSection = (type: SectionType) => {
    setSections((prev) => {
      const newSection: SectionDraft = {
        id: generateId(),
        step: type,
        label: `${SECTION_META[type].label} plan`,
        notes: '',
        juzSelections: [],
      };
      setActiveSectionId(newSection.id);
      return [...prev, newSection];
    });
  };

  const handleRemoveSection = (sectionId: string) => {
    setSections((prev) => {
      const updated = prev.filter((section) => section.id !== sectionId);
      if (activeSectionId === sectionId) {
        setActiveSectionId(updated[0]?.id || null);
      }
      return updated;
    });
  };

  const handleUpdateSection = (
    sectionId: string,
    updater: (section: SectionDraft) => SectionDraft
  ) => {
    setSections((prev) =>
      prev.map((section) => (section.id === sectionId ? updater(section) : section))
    );
  };

  const handleAddSelection = (
    sectionId: string,
    selection: Omit<ClassworkJuzSelection, 'id'>
  ) => {
    const newSelection: ClassworkJuzSelection = {
      ...selection,
      id: generateId(),
    };
    handleUpdateSection(sectionId, (section) => ({
      ...section,
      juzSelections: [...section.juzSelections, newSelection],
    }));
    setJuzPicker({ sectionId: null, selectedJuz: null, isCustom: false });
  };

  const portionChips = (summary: number) => [
    {
      portion: 'quarter' as AssignmentPortion,
      label: '1st ¼',
      segmentIndex: 0,
      range: buildPortionApproxRange(summary, 'quarter', 0),
    },
    {
      portion: 'quarter' as AssignmentPortion,
      label: '2nd ¼',
      segmentIndex: 1,
      range: buildPortionApproxRange(summary, 'quarter', 1),
    },
    {
      portion: 'quarter' as AssignmentPortion,
      label: '3rd ¼',
      segmentIndex: 2,
      range: buildPortionApproxRange(summary, 'quarter', 2),
    },
    {
      portion: 'quarter' as AssignmentPortion,
      label: '4th ¼',
      segmentIndex: 3,
      range: buildPortionApproxRange(summary, 'quarter', 3),
    },
    {
      portion: 'half' as AssignmentPortion,
      label: '1st ½',
      segmentIndex: 0,
      range: buildPortionApproxRange(summary, 'half', 0),
    },
    {
      portion: 'half' as AssignmentPortion,
      label: '2nd ½',
      segmentIndex: 1,
      range: buildPortionApproxRange(summary, 'half', 1),
    },
    {
      portion: 'three_quarters' as AssignmentPortion,
      label: '¾ Juz',
      segmentIndex: 0,
      range: buildPortionApproxRange(summary, 'three_quarters', 0),
    },
    {
      portion: 'full' as AssignmentPortion,
      label: 'Full Juz',
      segmentIndex: 0,
      range: buildPortionApproxRange(summary, 'full', 0),
    },
  ];

  const renderJuzPicker = () => {
    if (!juzPicker.sectionId) return null;

    const section = sections.find((item) => item.id === juzPicker.sectionId);
    if (!section) return null;

    const selectedSummary = JUZ_SUMMARIES.find(
      (item) => item.number === juzPicker.selectedJuz
    );

    return (
      <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white/80 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Select a Juz for {SECTION_META[section.step].label}
            </p>
            <p className="text-xs text-gray-500">
              Type "juz" in the quick command box or tap the buttons below to add more portions.
            </p>
          </div>
          <button
            onClick={() => setJuzPicker({ sectionId: null, selectedJuz: null, isCustom: false })}
            className="text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            Close ✕
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {JUZ_SUMMARIES.map((summary) => (
            <button
              key={summary.number}
              onClick={() =>
                setJuzPicker((prev) => ({
                  ...prev,
                  selectedJuz: summary.number,
                  isCustom: false,
                }))
              }
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                juzPicker.selectedJuz === summary.number
                  ? 'border-primary-500 bg-primary-500/10 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-600'
              }`}
            >
              <span className="font-semibold">Juz {summary.number}</span>
              <span className="text-[11px] text-gray-500">{summary.startSurahName}</span>
            </button>
          ))}
        </div>

        {selectedSummary ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
              <p className="font-medium text-gray-800">
                {selectedSummary.startSurahName} {selectedSummary.startAyah} →{' '}
                {selectedSummary.endSurahName} {selectedSummary.endAyah}
              </p>
              <p className="text-xs text-gray-500">
                Approx. {selectedSummary.approxAyahCount} āyāt in this Juz
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Quick portions
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {portionChips(selectedSummary.approxAyahCount).map((chip) => (
                  <button
                    key={`${chip.portion}-${chip.segmentIndex}`}
                    onClick={() =>
                      handleAddSelection(section.id, {
                        juzNumber: selectedSummary.number,
                        portion: chip.portion,
                        segmentIndex: chip.segmentIndex,
                        approxRange: {
                          startAyah: chip.range.start,
                          endAyah: chip.range.end,
                        },
                        label: `Juz ${selectedSummary.number} • ${chip.label} (āyāt ${chip.range.start}-${chip.range.end})`,
                      })
                    }
                    className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-100"
                  >
                    {chip.label}
                    <span className="ml-1 text-[10px] font-normal text-primary-500">
                      āyāt {chip.range.start}-{chip.range.end}
                    </span>
                  </button>
                ))}
                <button
                  onClick={() =>
                    setJuzPicker((prev) => ({
                      ...prev,
                      isCustom: !prev.isCustom,
                    }))
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    juzPicker.isCustom
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-amber-300 hover:text-amber-600'
                  }`}
                >
                  Custom range
                </button>
              </div>
            </div>

            {juzPicker.isCustom && (
              <div className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-amber-700">Start āyah</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedSummary.approxAyahCount}
                    value={juzPicker.customStart ?? ''}
                    onChange={(event) =>
                      setJuzPicker((prev) => ({
                        ...prev,
                        customStart: Number(event.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-amber-700">End āyah</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedSummary.approxAyahCount}
                    value={juzPicker.customEnd ?? ''}
                    onChange={(event) =>
                      setJuzPicker((prev) => ({
                        ...prev,
                        customEnd: Number(event.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    placeholder={selectedSummary.approxAyahCount.toString()}
                  />
                </div>

                <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => {
                      if (
                        !juzPicker.customStart ||
                        !juzPicker.customEnd ||
                        juzPicker.customStart >= juzPicker.customEnd
                      ) {
                        alert('Please provide a valid start and end āyah number');
                        return;
                      }
                      handleAddSelection(section.id, {
                        juzNumber: selectedSummary.number,
                        portion: 'custom',
                        customRange: {
                          startAyah: juzPicker.customStart,
                          endAyah: juzPicker.customEnd,
                        },
                        label: `Juz ${selectedSummary.number} • Custom āyāt ${juzPicker.customStart}-${juzPicker.customEnd}`,
                      });
                    }}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
                  >
                    Save custom range
                  </button>
                  <button
                    onClick={() =>
                      setJuzPicker((prev) => ({
                        ...prev,
                        isCustom: false,
                        customStart: undefined,
                        customEnd: undefined,
                      }))
                    }
                    className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
            Select a Juz above to see quick portion suggestions.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Classwork composer</h3>
            <p className="text-sm text-gray-500">
              Type quick commands like <span className="font-semibold text-primary-600">sabq</span>,{' '}
              <span className="font-semibold text-primary-600">sabqi</span>,{' '}
              <span className="font-semibold text-primary-600">manzil</span>, or{' '}
              <span className="font-semibold text-primary-600">juz</span> to build the lesson plan. Everything is mobile-friendly.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SECTION_META) as SectionType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleAddSection(type)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary-300 hover:text-primary-600"
              >
                <span>{SECTION_META[type].emoji}</span>
                <span>{SECTION_META[type].label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Quick command
          </label>
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleProcessKeyword(inputValue);
              }
            }}
            placeholder='Type "sabqi" then press enter…'
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <button
            onClick={() => handleProcessKeyword(inputValue)}
            className="mt-2 inline-flex items-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 md:mt-0"
          >
            Add
          </button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white/60 p-6 text-center shadow-sm">
          <div className="text-4xl">📝</div>
          <h4 className="mt-3 text-lg font-semibold text-gray-900">No sections yet</h4>
          <p className="mt-1 text-sm text-gray-500">
            Start by typing <span className="font-semibold text-primary-600">sabq</span>,{' '}
            <span className="font-semibold text-primary-600">sabqi</span>, or{' '}
            <span className="font-semibold text-primary-600">manzil</span> — or use the buttons above.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => {
            const meta = SECTION_META[section.step];
            const isActive = section.id === activeSectionId;

            return (
              <div
                key={section.id}
                className={`rounded-3xl border transition ${
                  isActive
                    ? 'border-primary-400 shadow-lg shadow-primary-500/10'
                    : 'border-gray-200 shadow-sm hover:border-primary-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
                  className={`flex w-full items-start justify-between rounded-t-3xl bg-gradient-to-r px-5 py-4 text-left sm:px-7 ${
                    isActive ? 'from-primary-500/10 via-primary-500/5 to-primary-500/10' : meta.color
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{meta.emoji}</span>
                      <div>
                        <p className="text-base font-semibold text-gray-900">{section.label}</p>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {meta.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-gray-600">
                      {section.juzSelections.length} portion
                      {section.juzSelections.length === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveSection(section.id);
                      }}
                      className="rounded-full bg-white/70 px-2 py-1 text-xs font-semibold text-red-500 shadow-sm transition hover:bg-white"
                    >
                      Remove
                    </button>
                  </div>
                </button>

                <div className="space-y-5 px-5 py-6 sm:px-7">
                  <div className="space-y-3">
                    {section.juzSelections.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-4 text-sm text-gray-500">
                        No Juz added yet. Type <span className="font-semibold text-primary-600">juz</span> or tap the button below to add one.
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {section.juzSelections.map((selection) => (
                          <li
                            key={selection.id}
                            className="flex flex-col gap-3 rounded-2xl border border-primary-100 bg-primary-50/80 p-4 text-sm text-primary-700 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-semibold text-primary-800">
                                {selection.label ||
                                  `Juz ${selection.juzNumber} • ${selection.portion.toUpperCase()}`}
                              </p>
                              {selection.approxRange?.startAyah && selection.approxRange?.endAyah && (
                                <p className="text-xs text-primary-500">
                                  āyāt {selection.approxRange.startAyah}-{selection.approxRange.endAyah} (approx.)
                                </p>
                              )}
                              {selection.customRange?.startAyah && selection.customRange?.endAyah && (
                                <p className="text-xs text-primary-500">
                                  Custom āyāt {selection.customRange.startAyah}-{selection.customRange.endAyah}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSection(section.id, (draft) => ({
                                  ...draft,
                                  juzSelections: draft.juzSelections.filter((item) => item.id !== selection.id),
                                }))
                              }
                              className="self-start rounded-full border border-transparent bg-white px-3 py-1 text-xs font-semibold text-primary-600 shadow-sm transition hover:border-primary-200 sm:self-auto"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-start">
                    <button
                      type="button"
                      onClick={() =>
                        setJuzPicker({ sectionId: section.id, selectedJuz: null, isCustom: false })
                      }
                      className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
                    >
                      {section.juzSelections.length > 0 ? 'Add another juz' : 'Add a juz'}
                    </button>
                    <div className="flex-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Notes (optional)
                      </label>
                      <textarea
                        value={section.notes}
                        onChange={(event) =>
                          handleUpdateSection(section.id, (draft) => ({
                            ...draft,
                            notes: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Additional instructions, tajweed focus, expected follow-up…"
                        className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                  </div>

                  {juzPicker.sectionId === section.id && renderJuzPicker()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssignmentSectionBuilder;

