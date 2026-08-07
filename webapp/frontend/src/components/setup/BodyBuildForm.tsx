import { useLocalizedMeta } from "../../lib/useLocalizedMeta";
import { useT } from "../../lib/i18n";
import { useScenarioStore } from "../../store/scenarioStore";
import { Card } from "../common/Card";
import { NumberField } from "../common/NumberField";
import { SelectField } from "../common/SelectField";

export function BodyBuildForm() {
  const t = useT();
  const { data: meta } = useLocalizedMeta();
  const model = useScenarioStore((s) => s.model);
  const setModel = useScenarioStore((s) => s.setModel);

  const ip = meta?.input_params;

  return (
    <Card title={t.bodyBuildForm.cardTitle}>
      <div className="grid grid-cols-2 gap-4">
        <NumberField
          label={t.bodyBuildForm.height}
          unit="m"
          value={model.height}
          onChange={(height) => setModel({ height })}
          min={ip?.height.min}
          max={ip?.height.max}
          step={ip?.height.step ?? 0.01}
        />
        <NumberField
          label={t.bodyBuildForm.weight}
          unit="kg"
          value={model.weight}
          onChange={(weight) => setModel({ weight })}
          min={ip?.weight.min}
          max={ip?.weight.max}
          step={ip?.weight.step ?? 0.1}
        />
        <NumberField
          label={t.bodyBuildForm.bodyFat}
          unit="%"
          value={model.fat}
          onChange={(fat) => setModel({ fat })}
          min={ip?.fat.min}
          max={ip?.fat.max}
          step={ip?.fat.step ?? 0.5}
        />
        <NumberField
          label={t.bodyBuildForm.age}
          unit={t.bodyBuildForm.years}
          value={model.age}
          onChange={(age) => setModel({ age })}
          min={ip?.age.min}
          max={ip?.age.max}
          step={1}
        />
        {meta && (
          <SelectField
            label={t.bodyBuildForm.sex}
            value={model.sex}
            options={meta.enums.sex}
            onChange={(sex) => setModel({ sex: sex as typeof model.sex })}
          />
        )}
        <NumberField
          label={t.bodyBuildForm.cardiacIndex}
          unit="L/min/m²"
          value={model.ci}
          onChange={(ci) => setModel({ ci })}
          min={ip?.ci.min}
          max={ip?.ci.max}
          step={ip?.ci.step ?? 0.01}
        />
        {meta && (
          <SelectField
            label={t.bodyBuildForm.bmrFormula}
            value={model.bmr_equation}
            options={meta.enums.bmr_equation}
            onChange={(bmr_equation) => setModel({ bmr_equation: bmr_equation as typeof model.bmr_equation })}
          />
        )}
        {meta && (
          <SelectField
            label={t.bodyBuildForm.bsaFormula}
            value={model.bsa_equation}
            options={meta.enums.bsa_equation}
            onChange={(bsa_equation) => setModel({ bsa_equation: bsa_equation as typeof model.bsa_equation })}
          />
        )}
      </div>
    </Card>
  );
}
