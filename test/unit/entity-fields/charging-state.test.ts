import { getChargingState } from "../../../src/entity-fields/charging-state";
import { HomeAssistantMock } from "../../helpers";

const makeSibling = (entity_id: string, device_class?: string, state_class?: string): ISiblingEntity => ({
    entity_id,
    device_class,
    state_class,
});

describe("Charging state", () => {

    test("is false when there is no charging configuration", () => {
        const hassMock = new HomeAssistantMock(true);
        const isCharging = getChargingState({ entity: "any" }, "90", hassMock.hass);

        expect(isCharging).toBe(false);
    })

    test("is true when charging state is in attribute", () => {
        const hassMock = new HomeAssistantMock(true);
        const entity = hassMock.addEntity("Sensor", "80", { is_charging: "true" })
        const isCharging = getChargingState(
            { entity: entity.entity_id, charging_state: { attribute: [ { name: "is_charging", value: "true" } ] } },
            entity.state,
            hassMock.hass);

        expect(isCharging).toBe(true);
    })

    test("is false when charging state is in attribute but attrib value is false", () => {
        const hassMock = new HomeAssistantMock(true);
        const entity = hassMock.addEntity("Sensor", "80", { is_charging: "true" })
        const isCharging = getChargingState(
            { entity: entity.entity_id, charging_state: { attribute: [ { name: "is_charging", value: "false" } ] } },
            entity.state,
            hassMock.hass);

        expect(isCharging).toBe(false);
    })

    test("is true when charging state is in attribute (more than one attribute in configuration)", () => {
        const hassMock = new HomeAssistantMock(true);
        const entity = hassMock.addEntity("Sensor", "80", { is_charging: "true" })
        const isCharging = getChargingState(
            { entity: entity.entity_id, charging_state: { attribute: [ { name: "status", value: "charging" }, { name: "is_charging", value: "true" } ] } },
            entity.state,
            hassMock.hass);

        expect(isCharging).toBe(true);
    })

    test("is false when charging state is in attribute (and attribute is missing)", () => {
        const hassMock = new HomeAssistantMock(true);
        const entity = hassMock.addEntity("Sensor", "80")
        const isCharging = getChargingState(
            { entity: entity.entity_id, charging_state: { attribute: [ { name: "status", value: "charging" }, { name: "is_charging", value: "true" } ] } },
            entity.state,
            hassMock.hass);

        expect(isCharging).toBe(false);
    })

    test.each([
        ["charging", true],
        ["charging", false, "MissingEntity"],
        ["discharging", false]
    ])("charging state is in the external entity state", (chargingEntityState: string, expected: boolean, missingEntitySuffix = "") => {
        const hassMock = new HomeAssistantMock(true);
        const entity = hassMock.addEntity("Sensor", "80")
        const entityChargingState = hassMock.addEntity("Charging sensor", chargingEntityState)
        const isCharging = getChargingState(
            { entity: entity.entity_id, charging_state: { entity_id: entityChargingState.entity_id + missingEntitySuffix, state: "charging" } },
            entity.state,
            hassMock.hass);

        expect(isCharging).toBe(expected);
    })

    test.each([
        ["charging", true],
        ["full", true],
        ["discharging", false],
    ])(
        "default charging state via device enum sibling (state: %s)",
        (chargingEntityState: string, expected: boolean) => {
            const hassMock = new HomeAssistantMock(true);
            const batteryEntity = hassMock.addEntity("Battery level", "80", {}, "sensor");
            const enumEntity = hassMock.addEntity("Battery state", chargingEntityState, { device_class: "enum" }, "sensor");
            const siblings = [makeSibling(enumEntity.entity_id, "enum")];

            const isCharging = getChargingState(
                { entity: batteryEntity.entity_id },
                batteryEntity.state,
                hassMock.hass,
                siblings,
            );

            expect(isCharging).toBe(expected);
        },
    )

    test("default charging state returns false when no device info", () => {
        const hassMock = new HomeAssistantMock(true);
        const batteryEntity = hassMock.addEntity("Battery level", "80", {}, "sensor");
        const isCharging = getChargingState(
            { entity: batteryEntity.entity_id },
            batteryEntity.state,
            hassMock.hass);

        expect(isCharging).toBe(false);
    })

    test("returns false when entity is not found in hass", () => {
        const hassMock = new HomeAssistantMock(true);
        const isCharging = getChargingState(
            { entity: "sensor.missing_entity", charging_state: { state: "charging" } },
            "80",
            hassMock.hass);

        expect(isCharging).toBe(false);
    })

    test("is true when attribute exists without specified value", () => {
        const hassMock = new HomeAssistantMock(true);
        const entity = hassMock.addEntity("Sensor", "80", { is_charging: "any_value" })
        const isCharging = getChargingState(
            { entity: entity.entity_id, charging_state: { attribute: { name: "is_charging", value: "any_value" } } },
            entity.state,
            hassMock.hass);

        expect(isCharging).toBe(true);
    })

    test("is true when state matches any of the specified states", () => {
        const hassMock = new HomeAssistantMock(true);
        const entity = hassMock.addEntity("Sensor", "charging")
        const isCharging = getChargingState(
            { entity: entity.entity_id, charging_state: { state: ["charging", "full", "connected"] } },
            entity.state,
            hassMock.hass);

        expect(isCharging).toBe(true);
    })

    test("is false when state doesn't match any of the specified states", () => {
        const hassMock = new HomeAssistantMock(true);
        const entity = hassMock.addEntity("Sensor", "discharging")
        const isCharging = getChargingState(
            { entity: entity.entity_id, charging_state: { state: ["charging", "full", "connected"] } },
            entity.state,
            hassMock.hass);

        expect(isCharging).toBe(false);
    })

    test("is true when charging_state config exists but no state array is specified and state is truthy", () => {
        const hassMock = new HomeAssistantMock(true);
        const entity = hassMock.addEntity("Sensor", "some_state")
        const isCharging = getChargingState(
            { entity: entity.entity_id, charging_state: {} },
            entity.state,
            hassMock.hass);

        expect(isCharging).toBe(true);
    })

    test("is false when charging_state config exists but no state array is specified and state is falsy", () => {
        const hassMock = new HomeAssistantMock(true);
        const entity = hassMock.addEntity("Sensor", "")
        const isCharging = getChargingState(
            { entity: entity.entity_id, charging_state: {} },
            entity.state,
            hassMock.hass);

        expect(isCharging).toBe(false);
    })

    test("is true when attribute is in nested path", () => {
        const hassMock = new HomeAssistantMock(true);
        const entity = hassMock.addEntity("Sensor", "80", {
            device: {
                charging: {
                    status: "active"
                }
            }
        })
        const isCharging = getChargingState(
            { entity: entity.entity_id, charging_state: { attribute: { name: "device.charging.status", value: "active" } } },
            entity.state,
            hassMock.hass);

        expect(isCharging).toBe(true);
    })

    test.each([
        ["on", true],
        ["off", false],
    ])("default charging state from binary_sensor plug on same device (state: %s)", (plugState: string, expected: boolean) => {
        const hassMock = new HomeAssistantMock(true);
        const batteryEntity = hassMock.addEntity("Battery level", "80", {}, "sensor");
        const plugEntity = hassMock.addEntity("Charger plug", plugState, { device_class: "plug" }, "binary_sensor");
        const siblings = [makeSibling(plugEntity.entity_id, "plug")];

        const isCharging = getChargingState(
            { entity: batteryEntity.entity_id },
            "80",
            hassMock.hass,
            siblings,
        );

        expect(isCharging).toBe(expected);
    })

    test("default charging state: enum entity takes precedence over plug on same device", () => {
        const hassMock = new HomeAssistantMock(true);
        const batteryEntity = hassMock.addEntity("Battery level", "80", {}, "sensor");
        const enumEntity = hassMock.addEntity("Battery state", "discharging", { device_class: "enum" }, "sensor");
        const plugEntity = hassMock.addEntity("Charger plug", "on", { device_class: "plug" }, "binary_sensor");
        const siblings = [
            makeSibling(enumEntity.entity_id, "enum"),
            makeSibling(plugEntity.entity_id, "plug"),
        ];

        const isCharging = getChargingState(
            { entity: batteryEntity.entity_id },
            "80",
            hassMock.hass,
            siblings,
        );

        // enum entity found first with "discharging" ? not a charging state
        expect(isCharging).toBe(false);
    })

    test.each([
        ["on", true],
        ["off", false],
    ])("default charging state from binary_sensor battery_charging on same device (state: %s)", (chargingState: string, expected: boolean) => {
        const hassMock = new HomeAssistantMock(true);
        const batteryEntity = hassMock.addEntity("Speaker battery", "100", { device_class: "battery" }, "sensor");
        const chargingEntity = hassMock.addEntity("Speaker charging", chargingState, { device_class: "battery_charging" }, "binary_sensor");
        const siblings = [makeSibling(chargingEntity.entity_id, "battery_charging")];

        const isCharging = getChargingState(
            { entity: batteryEntity.entity_id },
            "100",
            hassMock.hass,
            siblings,
        );

        expect(isCharging).toBe(expected);
    })

    test("default charging state: battery_charging takes precedence over enum on same device", () => {
        const hassMock = new HomeAssistantMock(true);
        const batteryEntity = hassMock.addEntity("Vacuum battery", "80", {}, "sensor");
        const statusEntity = hassMock.addEntity("Vacuum status", "returning_home", { device_class: "enum", options: ["cleaning", "returning_home", "charging"] }, "sensor");
        const chargingEntity = hassMock.addEntity("Vacuum charging", "on", { device_class: "battery_charging" }, "binary_sensor");
        const siblings = [
            makeSibling(statusEntity.entity_id, "enum"),
            makeSibling(chargingEntity.entity_id, "battery_charging"),
        ];

        const isCharging = getChargingState(
            { entity: batteryEntity.entity_id },
            "80",
            hassMock.hass,
            siblings,
        );

        expect(isCharging).toBe(true);
    })

    test.each([
        ["Charging", true],
        ["Full", true],
        ["Not Charging", false],
        ["charging", true],
        ["discharging", false],
        ["not_charging", false],
    ])("default charging state from paired battery_state sensor (state: %s)", (batteryState: string, expected: boolean) => {
        const hassMock = new HomeAssistantMock(true);
        const batteryEntity = hassMock.addEntity("Phone battery level", "60", { device_class: "battery" }, "sensor");
        const stateEntity = hassMock.addEntity("Phone battery state", batteryState, {}, "sensor");
        const siblings = [makeSibling(stateEntity.entity_id)];

        const isCharging = getChargingState(
            { entity: batteryEntity.entity_id },
            "60",
            hassMock.hass,
            siblings,
        );

        expect(isCharging).toBe(expected);
    })

    test.each([
        ["sensor.phone_battery_level", false],
        ["sensor.phone_watch_battery_level", true],
    ])("default charging state uses battery_state paired by name when device has more batteries (%s)", (entityId: string, expected: boolean) => {
        const hassMock = new HomeAssistantMock(true);
        hassMock.addEntity("Phone battery level", "60", { device_class: "battery" }, "sensor");
        hassMock.addEntity("Phone watch battery level", "70", { device_class: "battery" }, "sensor");
        const phoneState = hassMock.addEntity("Phone battery state", "Not Charging", {}, "sensor");
        const watchState = hassMock.addEntity("Phone watch battery state", "Charging", {}, "sensor");
        const siblings = [
            makeSibling(phoneState.entity_id),
            makeSibling(watchState.entity_id),
        ];

        const isCharging = getChargingState(
            { entity: entityId },
            "60",
            hassMock.hass,
            siblings,
        );

        expect(isCharging).toBe(expected);
    })

    test.each([
        ["charging", true],
        ["full_charge", true],
        ["not_charging", false],
    ])("default charging state from Matter battery charge state enum (state: %s)", (chargeState: string, expected: boolean) => {
        const hassMock = new HomeAssistantMock(true);
        const batteryEntity = hassMock.addEntity("Curtain battery", "58", { device_class: "battery" }, "sensor");
        const chargeStateEntity = hassMock.addEntity("Curtain battery charge state", chargeState, { device_class: "enum", options: ["not_charging", "charging", "full_charge"] }, "sensor");
        const siblings = [makeSibling(chargeStateEntity.entity_id, "enum")];

        const isCharging = getChargingState(
            { entity: batteryEntity.entity_id },
            "58",
            hassMock.hass,
            siblings,
        );

        expect(isCharging).toBe(expected);
    })

    test("default charging state skips enum sensors which can't report charging", () => {
        const hassMock = new HomeAssistantMock(true);
        const batteryEntity = hassMock.addEntity("Vacuum battery", "80", {}, "sensor");
        const errorEntity = hassMock.addEntity("Vacuum error", "none", { device_class: "enum", options: ["none", "bumper_stuck"] }, "sensor");
        const statusEntity = hassMock.addEntity("Vacuum status", "charging", { device_class: "enum", options: ["cleaning", "charging"] }, "sensor");
        const siblings = [
            makeSibling(errorEntity.entity_id, "enum"),
            makeSibling(statusEntity.entity_id, "enum"),
        ];

        const isCharging = getChargingState(
            { entity: batteryEntity.entity_id },
            "80",
            hassMock.hass,
            siblings,
        );

        expect(isCharging).toBe(true);
    })

    test("default charging state skips unavailable entities", () => {
        const hassMock = new HomeAssistantMock(true);
        const batteryEntity = hassMock.addEntity("Battery level", "80", {}, "sensor");
        const chargingEntity = hassMock.addEntity("Charging", "unavailable", { device_class: "battery_charging" }, "binary_sensor");
        const plugEntity = hassMock.addEntity("Charger plug", "on", { device_class: "plug" }, "binary_sensor");
        const siblings = [
            makeSibling(chargingEntity.entity_id, "battery_charging"),
            makeSibling(plugEntity.entity_id, "plug"),
        ];

        const isCharging = getChargingState(
            { entity: batteryEntity.entity_id },
            "80",
            hassMock.hass,
            siblings,
        );

        expect(isCharging).toBe(true);
    })

    test("plug entity on different device is ignored", () => {
        const hassMock = new HomeAssistantMock(true);
        const batteryEntity = hassMock.addEntity("Battery level", "80", {}, "sensor");
        hassMock.addEntity("Other plug", "on", { device_class: "plug" }, "binary_sensor");
        // siblings is empty because plug is on a different device
        const siblings: ISiblingEntity[] = [];

        const isCharging = getChargingState(
            { entity: batteryEntity.entity_id },
            "80",
            hassMock.hass,
            siblings,
        );

        expect(isCharging).toBe(false);
    })

    test("plug entity without device_class plug is ignored", () => {
        const hassMock = new HomeAssistantMock(true);
        const batteryEntity = hassMock.addEntity("Battery level", "80", {}, "sensor");
        const binaryEntity = hassMock.addEntity("Some binary", "on", {}, "binary_sensor");
        // no device_class ? undefined
        const siblings = [makeSibling(binaryEntity.entity_id)];

        const isCharging = getChargingState(
            { entity: batteryEntity.entity_id },
            "80",
            hassMock.hass,
            siblings,
        );

        expect(isCharging).toBe(false);
    })

});
